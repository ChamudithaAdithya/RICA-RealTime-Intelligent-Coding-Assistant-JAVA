import { AiCandidate, AiDecision } from '../../domain/ai';
import { FullASTOutput } from '../../domain/astTypes';
import { ProjectDependencyGraph } from '../../dependencyGraph';
import { buildCandidatePath } from './contextBuilder';

export interface HeuristicAdvisorOptions {
  /** Confidence when the probe finds a real gap. */
  violationConfidence: number;
  /** Confidence when an authorization annotation is present on the path. */
  cleanConfidence: number;
}

const DEFAULT_OPTS: HeuristicAdvisorOptions = {
  violationConfidence: 0.6,
  cleanConfidence: 0.75,
};

/**
 * Option C: deterministic, zero-resource security probe that works with the AI
 * disabled. Uses only the pre-computed per-candidate execution path:
 *  - any step on the path carries an auth annotation -> NO_VIOLATION
 *  - no step carries an auth annotation on a mutating entry -> VIOLATION (advisory)
 */
export function runHeuristicAdvisor(
  candidates: AiCandidate[],
  filesMap: Record<string, FullASTOutput>,
  graph: ProjectDependencyGraph,
  opts?: Partial<HeuristicAdvisorOptions>,
): AiDecision[] {
  const { violationConfidence, cleanConfidence } = { ...DEFAULT_OPTS, ...(opts ?? {}) };
  const decisions: AiDecision[] = [];

  for (const candidate of candidates) {
    if (candidate.featureType === 'ambiguity') continue;
    const path = buildCandidatePath(candidate, filesMap, graph);
    const entry = path[0];
    if (!entry) continue;

    const pathHasAuth = path.some(s => s.hasAuthAnnotation);
    decisions.push(
      pathHasAuth
        ? {
            violationId: candidate.violationId,
            verdict: 'NO_VIOLATION',
            confidence: cleanConfidence,
            reasoning: 'An authorization annotation exists on the call path; the security boundary is enforced outside this method.',
            findings: [],
            ambiguityResolution: { directive: 'confirm', rationale: 'Existing security annotation on the path resolves the probe.' },
          }
        : {
            violationId: candidate.violationId,
            verdict: 'VIOLATION',
            confidence: violationConfidence,
            reasoning: 'Mutating entry point whose call chain carries no authorization annotation. RICA cannot rule out framework-level filters, so this stays advisory.',
            findings: [{
              kind: 'missingAuthorizationCheck',
              message: `Mutating operation '${entry.caller}' has no authorization annotation on any resolved step.`,
              code: 'RICA-V000',
              strength: 'moderate',
              quickFix: {
                title: 'Add authorization requirement',
                description: 'Protect the endpoint with Spring Security before processing begins. Adjust the expression to your role model.',
                edits: [{
                  filePath: candidate.filePath,
                  line: candidate.lineNumber ?? 1,
                  kind: 'insertBefore',
                  text: '@PreAuthorize("isAuthenticated()")',
                }],
              },
            }],
            ambiguityResolution: { directive: 'review', rationale: 'Deterministic probe cannot see framework-level security filters; recommended for manual review.' },
          },
    );
  }

  return decisions;
}