import { AiCandidate, AiAuditLogEntry, AiContextPayload, AiDecision, AiInsights } from '../../domain/ai';
import { Violation } from '../../domain/violations';
import { AnalyzerConfig } from '../../domain/analyzerConfig';
import { AiDecisionProvider } from '../ports/aiDecisionProvider';
import { AiAuditLogger } from '../ports/aiAuditLogger';
import { FullASTOutput } from '../../domain/astTypes';
import { ProjectDependencyGraph } from '../../dependencyGraph';
import { triageAll } from './triage';
import { buildContext } from './contextBuilder';
import { runHeuristicAdvisor } from './heuristicAdvisor';
import { hasSecurityAnnotation } from './triage';

export interface AdvisoryRunResult {
  /** Deterministic violations that received advisory annotations (same object refs). */
  annotatedCount: number;
  /** Net-new advisory violations (from missingCheck probes). */
  advisoryCount: number;
  /** Net-new advisory Violation objects to persist on the manager. */
  advisoryViolations: Violation[];
  /** Human-readable outcome for the status bar / logs. */
  outcome: 'noop' | 'offline' | 'heuristic' | 'ai' | 'error';
  error?: string;
  latencyMs: number;
}

export interface AdvisorDependencies {
  config: AnalyzerConfig;
  provider: AiDecisionProvider;
  auditLogger: AiAuditLogger;
  /** Live accessor: ViolationManager replaces its cache on every analysis run. */
  getFilesMap: () => Record<string, FullASTOutput>;
  /** Live accessor: the dependency graph is rebuilt on full runs. */
  getGraph: () => ProjectDependencyGraph;
  readSource?: (filePath: string) => string | undefined;
  /** Injectable clock for tests. */
  now?: () => Date;
}

/**
 * Orchestrates the advisory pipeline: triage -> bounded context -> deterministic
 * heuristic probe -> (optional) LLM evaluate -> merge -> audit. Fire-and-forget
 * from the analysis pipeline: all failures here are swallowed and logged.
 *
 * Advisory Non-Deletion Principle: AI annotates deterministic violations and
 * adds net-new advisory findings; it NEVER deletes or downgrades a rule-made
 * violation. enableAiAdvisory=false leaves today's pipeline byte-for-byte.
 */
export class AiAdvisoryCoordinator {
  constructor(private readonly deps: AdvisorDependencies) {}

  async run(violations: Violation[]): Promise<AdvisoryRunResult> {
    const start = Date.now();
    const { config } = this.deps;
    const noop = (outcome: AdvisoryRunResult['outcome'], latencyMs: number): AdvisoryRunResult => ({
      annotatedCount: 0, advisoryCount: 0, advisoryViolations: [], outcome, latencyMs,
    });

    if (!config.ai.enableAiAdvisory || config.ai.aiProvider === 'off') {
      return noop('noop', Date.now() - start);
    }

    const filesMap = this.deps.getFilesMap();
    const graph = this.deps.getGraph();
    const candidates = triageAll(violations, filesMap, {
      maxCandidates: config.ai.aiMaxCandidatesPerRun,
    });
    if (candidates.length === 0) {
      return noop('noop', Date.now() - start);
    }

    const context = buildContext({
      candidates,
      filesMap,
      graph,
      opts: {
        readSource: this.deps.readSource,
      },
    });

    const heuristicDecisions = runHeuristicAdvisor(candidates, filesMap, graph);

    const useAi = await this.deps.provider.isAvailable();
    let aiDecisions: AiDecision[] = [];
    let error: string | undefined;
    if (useAi) {
      try {
        aiDecisions = await this.deps.provider.evaluate(context);
      } catch (e) {
        error = (e as Error).message;
      }
    }

    const { annotated, advisory } = merge(
      violations,
      candidates,
      heuristicDecisions,
      useAi ? aiDecisions : [],
      !useAi,
    );

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

  private writeAuditEntry(
    candidates: AiCandidate[],
    context: AiContextPayload,
    heuristic: AiDecision[],
    ai: AiDecision[],
    usedAi: boolean,
    error: string | undefined,
    latencyMs: number,
  ): void {
    if (!this.deps.config.ai.aiAuditLogEnabled) return;
    const now = (this.deps.now ?? (() => new Date()))();
    const entry: AiAuditLogEntry = {
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

interface MergedResult {
  annotated: number;
  advisory: Violation[];
}

function merge(
  violations: Violation[],
  candidates: AiCandidate[],
  heuristic: AiDecision[],
  ai: AiDecision[],
  aiOffline: boolean,
): MergedResult {
  // Rank decision sources: AI (when available) over heuristic; keep first per candidate.
  const ranked: AiDecision[] = [];
  const seen = new Set<string>();
  for (const d of [...heuristic, ...ai]) {
    const key = d.violationId || `probe:${probeIndex(d, ranked)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push(d);
  }

  const probes = candidates.filter(c => !c.violationId);

  let annotated = 0;
  const advisory: Violation[] = [];
  for (const d of ranked) {
    if (d.violationId) {
      const violation = violations.find(v => v.id === d.violationId);
      if (!violation) continue;
      attachInsights(violation, d);
      annotated++;
      continue;
    }
    const probe = probes.shift();
    if (!probe && d.findings.length > 0) continue;
    const source = probe ?? candidates[candidates.length - 1];
    if (!source) continue;
    for (const finding of d.findings) {
      advisory.push(advisoryViolation(source, d, finding));
    }
  }

  return { annotated, advisory };
}

function probeIndex(d: AiDecision, ranked: AiDecision[]): number {
  return ranked.length;
}

function advisoryViolation(
  source: AiCandidate,
  d: AiDecision,
  finding: AiDecision['findings'][number],
): Violation {
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

function attachInsights(violation: Violation, d: AiDecision): void {
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
  if (first?.quickFix) violation.quickFix = first.quickFix;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16);
}
