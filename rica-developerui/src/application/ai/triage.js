"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_RELEVANT_CODES = void 0;
exports.triageViolations = triageViolations;
exports.collectEntryPointProbes = collectEntryPointProbes;
exports.triageAll = triageAll;
exports.hasSecurityAnnotation = hasSecurityAnnotation;
/**
 * RICA-V codes whose verdict can genuinely benefit from semantic reasoning.
 * Pure structural evidence rules are excluded: no point spending tokens on them.
 */
exports.AI_RELEVANT_CODES = new Set([
    'RICA-V104', 'RICA-V106', 'RICA-V108', 'RICA-V109',
    'RICA-V201', 'RICA-V202', 'RICA-V203', 'RICA-V204', 'RICA-V207',
    'RICA-V300', 'RICA-V301', 'RICA-V302', 'RICA-V303', 'RICA-V304',
    'RICA-V305', 'RICA-V306', 'RICA-V307',
    'RICA-V401', 'RICA-V402', 'RICA-V403', 'RICA-V404', 'RICA-V501',
]);
const AMBIGUITY_CODES = new Set([
    'RICA-V202', 'RICA-V207', 'RICA-V501', 'RICA-V401', 'RICA-V403', 'RICA-V404',
    'RICA-V300', 'RICA-V301', 'RICA-V302', 'RICA-V303', 'RICA-V304', 'RICA-V305', 'RICA-V306', 'RICA-V307',
]);
const LOW_CONFIDENCE_THRESHOLD = 0.75;
const MUTATING_VERB_ANNOTATIONS = ['PostMapping', 'PutMapping', 'DeleteMapping', 'PatchMapping', 'RequestMapping'];
/**
 * Select candidates for AI reasoning from active deterministic violations.
 * Deterministic: same violations + files always produce the same candidate set.
 */
function triageViolations(violations, opts) {
    const relevant = opts.relevantCodes ?? exports.AI_RELEVANT_CODES;
    const candidates = [];
    for (const v of violations) {
        if (!v.code || !relevant.has(v.code))
            continue;
        candidates.push(violationToCandidate(v));
        if (candidates.length >= opts.maxCandidates)
            break;
    }
    return candidates;
}
/**
 * Scan all entry-point methods for missing-check probes: alert-worthy mutating
 * endpoints whose call chains carry no authorization annotations. These are the
 * net-new candidates (featureType 'missingCheck') and also feed the heuristic
 * advisor when the AI is off.
 */
function collectEntryPointProbes(filesMap, maxCandidates) {
    const probes = [];
    const entryClassNames = ['Controller', 'Resource', 'Endpoint', 'GraphQL'];
    for (const filePath of Object.keys(filesMap)) {
        const ast = filesMap[filePath];
        for (const cls of ast.classes) {
            if (!isEntryPointClass(cls, entryClassNames))
                continue;
            for (const method of cls.methods) {
                const verb = httpVerbFor(method);
                if (!verb)
                    continue;
                probes.push({
                    violationId: '',
                    code: 'RICA-V000',
                    ruleName: 'advisory-missing-authorization-check',
                    filePath,
                    lineNumber: method.startLine,
                    severity: 'warning',
                    reason: `Mutating endpoint (${verb}) with no authorization annotation on the method or its call chain (semantic probe)`,
                    featureType: 'missingCheck',
                    evidence: `${cls.fullyQualifiedName}.${method.name}(${method.parameters.map(p => p.dataType).join(', ')})`,
                });
                if (probes.length >= maxCandidates)
                    return probes;
            }
        }
    }
    return probes;
}
/** Merge violation candidates with entry-point probes, deduped and capped. */
function triageAll(violations, filesMap, opts) {
    const fromViolations = triageViolations(violations, opts);
    const probes = opts.includeMissingCheckProbes === false ? [] : collectEntryPointProbes(filesMap, opts.maxCandidates);
    const seen = new Set();
    const merged = [];
    for (const c of [...fromViolations, ...probes]) {
        const key = c.violationId || `${c.featureType}:${c.evidence}:${c.lineNumber || 0}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        merged.push(c);
        if (merged.length >= opts.maxCandidates)
            break;
    }
    return merged;
}
function violationToCandidate(v) {
    const featureType = AMBIGUITY_CODES.has(v.code ?? '') ? 'ambiguity' : 'semanticProbe';
    const methodName = v.contextMetadata?.methodName;
    const className = classNameFromPath(v.filePath);
    let reason = v.message || v.ruleName;
    if (v.contextMetadata?.layerInvolved || v.contextMetadata?.sourceLayer || v.contextMetadata?.targetLayer) {
        const ctx = [v.contextMetadata.sourceLayer, v.contextMetadata.targetLayer].filter(Boolean).join(' -> ');
        reason = `${reason} (${ctx})`;
    }
    return {
        violationId: v.id,
        code: v.code ?? 'RICA-V000',
        ruleName: v.ruleName,
        filePath: v.filePath,
        lineNumber: v.lineNumber,
        severity: v.severity,
        reason,
        featureType,
        evidence: [className, methodName].filter(Boolean).join('.') || v.filePath,
    };
}
function classNameFromPath(filePath) {
    const base = filePath.split(/[/\\]/).pop() || '';
    return base.replace(/\.java$/, '');
}
function isEntryPointClass(cls, suffixes) {
    return cls.annotations.some(a => suffixes.some(s => a.name.endsWith(s)));
}
/** Lowest-confidence mechanism: only flag entry points whose own class/method lacks the annotation. */
function hasSecurityAnnotation(annotations) {
    const security = ['PreAuthorize', 'Secured', 'RolesAllowed', 'PostAuthorize', 'PreFilter', 'PostFilter'];
    return annotations.some(a => security.some(s => a.name.includes(s)));
}
function httpVerbFor(method) {
    for (const ann of method.annotations) {
        const name = ann.name;
        if (name === 'PostMapping')
            return 'POST';
        if (name === 'PutMapping')
            return 'PUT';
        if (name === 'DeleteMapping')
            return 'DELETE';
        if (name === 'PatchMapping')
            return 'PATCH';
        if (name === 'RequestMapping')
            return 'POST';
    }
    return null;
}
//# sourceMappingURL=triage.js.map