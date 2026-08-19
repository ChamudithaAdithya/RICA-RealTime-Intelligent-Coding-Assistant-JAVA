"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAdvisoryCoordinator = void 0;
const triage_1 = require("./triage");
const contextBuilder_1 = require("./contextBuilder");
const heuristicAdvisor_1 = require("./heuristicAdvisor");
/**
 * Orchestrates the advisory pipeline: triage -> bounded context -> deterministic
 * heuristic probe -> (optional) LLM evaluate -> merge -> audit. Fire-and-forget
 * from the analysis pipeline: all failures here are swallowed and logged.
 *
 * Advisory Non-Deletion Principle: AI annotates deterministic violations and
 * adds net-new advisory findings; it NEVER deletes or downgrades a rule-made
 * violation. enableAiAdvisory=false leaves today's pipeline byte-for-byte.
 */
class AiAdvisoryCoordinator {
    constructor(deps) {
        this.deps = deps;
    }
    async run(violations) {
        const start = Date.now();
        const { config } = this.deps;
        const noop = (outcome, latencyMs) => ({
            annotatedCount: 0, advisoryCount: 0, advisoryViolations: [], outcome, latencyMs,
        });
        if (!config.ai.enableAiAdvisory || config.ai.aiProvider === 'off') {
            return noop('noop', Date.now() - start);
        }
        const filesMap = this.deps.getFilesMap();
        const graph = this.deps.getGraph();
        const candidates = (0, triage_1.triageAll)(violations, filesMap, {
            maxCandidates: config.ai.aiMaxCandidatesPerRun,
        });
        if (candidates.length === 0) {
            return noop('noop', Date.now() - start);
        }
        const context = (0, contextBuilder_1.buildContext)({
            candidates,
            filesMap,
            graph,
            opts: {
                readSource: this.deps.readSource,
            },
        });
        const heuristicDecisions = (0, heuristicAdvisor_1.runHeuristicAdvisor)(candidates, filesMap, graph);
        const useAi = await this.deps.provider.isAvailable();
        let aiDecisions = [];
        let error;
        if (useAi) {
            try {
                aiDecisions = await this.deps.provider.evaluate(context);
            }
            catch (e) {
                error = e.message;
            }
        }
        const { annotated, advisory } = merge(violations, candidates, heuristicDecisions, useAi ? aiDecisions : [], !useAi);
        const latencyMs = Date.now() - start;
        this.writeAuditEntry(candidates, context, heuristicDecisions, aiDecisions, useAi, error, latencyMs);
        return {
            annotatedCount: annotated,
            advisoryCount: advisory.length,
            advisoryViolations: advisory,
            outcome: error ? 'error' : useAi ? 'ai' : 'heuristic',
            ...(error ? { error } : {}),
            latencyMs,
        };
    }
    writeAuditEntry(candidates, context, heuristic, ai, usedAi, error, latencyMs) {
        if (!this.deps.config.ai.aiAuditLogEnabled)
            return;
        const now = (this.deps.now ?? (() => new Date()))();
        const entry = {
            id: `ai-${now.getTime().toString(16)}`,
            timestamp: now.toISOString(),
            request: {
                contextId: context.candidates.map(c => c.violationId || c.evidence).join('|').slice(0, 80),
                candidateCount: candidates.length,
                model: this.deps.config.ai.aiModel,
                provider: this.deps.config.ai.aiProvider,
            },
            response: usedAi ? ai : heuristic,
            ...(error ? { error } : {}),
            latencyMs,
        };
        this.deps.auditLogger.log(entry);
    }
}
exports.AiAdvisoryCoordinator = AiAdvisoryCoordinator;
function merge(violations, candidates, heuristic, ai, aiOffline) {
    // Rank decision sources: AI (when available) over heuristic; keep first per candidate.
    const ranked = [];
    const seen = new Set();
    for (const d of [...heuristic, ...ai]) {
        const key = d.violationId || `probe:${probeIndex(d, ranked)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        ranked.push(d);
    }
    const probes = candidates.filter(c => !c.violationId);
    let annotated = 0;
    const advisory = [];
    for (const d of ranked) {
        if (d.violationId) {
            const violation = violations.find(v => v.id === d.violationId);
            if (!violation)
                continue;
            attachInsights(violation, d);
            annotated++;
            continue;
        }
        const probe = probes.shift();
        if (!probe && d.findings.length > 0)
            continue;
        const source = probe ?? candidates[candidates.length - 1];
        if (!source)
            continue;
        for (const finding of d.findings) {
            advisory.push(advisoryViolation(source, d, finding));
        }
    }
    return { annotated, advisory };
}
function probeIndex(d, ranked) {
    return ranked.length;
}
function advisoryViolation(source, d, finding) {
    return {
        id: `ADV-${source.filePath}-${source.lineNumber ?? 0}-${hash(finding.message)}`,
        ruleName: 'advisory: authorization check',
        severity: 'warning',
        message: finding.message,
        filePath: source.filePath,
        lineNumber: source.lineNumber,
        code: finding.code || 'RICA-V000',
        mitigationHint: 'Review security controls for this endpoint. RICA advisory findings never block the deterministic audit.',
        detectorSource: 'AiAdvisory',
        quickFix: finding.quickFix,
        aiInsights: {
            requestId: 'advisory-pass',
            verdict: d.verdict,
            confidence: d.confidence,
            reasoning: d.reasoning,
            findings: [finding],
            quickFix: finding.quickFix,
            reviewedAt: new Date().toISOString(),
        },
    };
}
function attachInsights(violation, d) {
    const first = d.findings[0];
    violation.aiInsights = {
        requestId: 'advisory-pass',
        verdict: d.verdict,
        confidence: d.confidence,
        reasoning: d.reasoning,
        findings: d.findings,
        quickFix: first?.quickFix,
        reviewedAt: new Date().toISOString(),
    };
    if (first?.quickFix)
        violation.quickFix = first.quickFix;
}
function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16);
}
//# sourceMappingURL=aiAdvisoryCoordinator.js.map