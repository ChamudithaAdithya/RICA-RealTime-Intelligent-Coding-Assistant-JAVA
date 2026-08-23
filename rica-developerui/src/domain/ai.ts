import type { ViolationSeverity } from './violations';

export type AiProviderKind = 'off' | 'ollama' | 'openai-compatible';
export type AiTriggerKind = 'onDemand' | 'onSave' | 'onFullScan';

/**
 * A violation escalated to the AI advisor for semantic reasoning.
 */
export interface AiCandidate {
  violationId: string;
  code: string;
  ruleName: string;
  filePath: string;
  lineNumber?: number;
  severity: ViolationSeverity;
  reason: string;
  /** Why this candidate needs AI: deterministic ambiguity, a semantic probe, or a missing cross-cutting check */
  featureType: 'ambiguity' | 'semanticProbe' | 'missingCheck';
  evidence: string;
}

export type AiExecutionStepRole = 'entryPoint' | 'service' | 'infrastructure';

/**
 * One resolved hop along the call chain from entry point into deep layers.
 */
export interface AiExecutionStep {
  /** Resolved signature, e.g. 'OrderResource.placeOrder(OrderRequest)' */
  caller: string;
  file: string;
  hasAuthAnnotation: boolean;
  isPrivilegedOperation: boolean;
  /** Resolved callee signatures invoked at this step */
  calls: string[];
  /** OR-branch callee candidates when dynamic dispatch could not be resolved to one target */
  ambiguousCallees: string[];
  /** Trimmed source slices for this step */
  sourceSlices: string[];
}

/**
 * The bounded, pre-digested context handed to the LLM. No raw AST blobs.
 */
export interface AiContextPayload {
  language: 'java';
  boundary: string;
  candidates: AiCandidate[];
  executionPath: AiExecutionStep[];
  riskNotes: string[];
}

export type AiDecisionVerdict = 'VIOLATION' | 'NO_VIOLATION' | 'AMBIGUOUS';

export interface AiQuickFixEdit {
  filePath: string;
  /** 1-based line to anchor the edit */
  line: number;
  kind: 'insertBefore' | 'insertAfter' | 'replace';
  text: string;
}

export interface AiQuickFix {
  title: string;
  description: string;
  edits: AiQuickFixEdit[];
}

export interface AiSemanticFinding {
  kind: 'missingAuthorizationCheck' | 'missingValidation' | 'unhandledCondition' | 'misplacedLogic' | 'other';
  message: string;
  /** RICA-V000 for advisory findings; may reuse a deterministic code for substantiated ones */
  code: string;
  strength: 'strong' | 'moderate' | 'weak';
  quickFix?: AiQuickFix;
}

export interface AiAmbiguityResolution {
  directive: 'dismiss' | 'review' | 'confirm';
  rationale: string;
}

export interface AiDecision {
  /** id of the candidate violation; empty string for net-new advisory findings */
  violationId: string;
  verdict: AiDecisionVerdict;
  confidence: number;
  reasoning: string;
  findings: AiSemanticFinding[];
  ambiguityResolution?: AiAmbiguityResolution;
}

/**
 * In-memory mark attached to a Violation after an advisory pass.
 */
export interface AiInsights {
  requestId: string;
  verdict: AiDecisionVerdict;
  confidence: number;
  reasoning: string;
  findings: AiSemanticFinding[];
  quickFix?: AiQuickFix;
  reviewedAt: string;
}

export interface AiAuditLogEntry {
  id: string;
  timestamp: string;
  request: {
    contextId: string;
    candidateCount: number;
    model: string;
    provider: AiProviderKind;
  };
  response: AiDecision[];
  error?: string;
  latencyMs: number;
}
