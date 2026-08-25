export type ViolationSeverity = 'error' | 'warning' | 'info';

import type { AiInsights, AiQuickFix, AiQuickFixEdit } from './ai';

export type FixSafety = 'auto-safe' | 'preview-required' | 'manual-design-required';

export interface RemediationSuggestion {
    title: string;
    description: string;
    safety: FixSafety;
    steps: string[];
    edits?: AiQuickFixEdit[];
}

export interface DiagnosticRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface RelatedInformation {
  message: string;
  filePath: string;
  range: DiagnosticRange;
}

export interface ViolationContextMetadata {
    targetComponent?: string;
    methodName?: string;
    fieldName?: string;
    receiverVariable?: string;
    layerInvolved?: string;
    sourceLayer?: string;
    targetLayer?: string;
}

export type ViolationConfidence = 'High' | 'Medium' | 'Low';

export interface ViolationAnalysisMetadata {
    confidence: ViolationConfidence;
    evidence: string;
    reason: string;
    type: string;
}

export interface Violation {
    id: string;
    ruleName: string;
    severity: ViolationSeverity;
    message: string;
    filePath: string;
    lineNumber?: number;
    columnNumber?: number;
    /** Standardized diagnostic code (e.g. 'RICA-V401') */
    code?: string;
    /** Relative docs page slug derived from the violation catalog (e.g. '/violations/RICA-V401'). */
    documentationUrl?: string;
    /** Precise source range for editor highlighting */
    range?: DiagnosticRange;
    /** Cross-file trace links */
    relatedInformation?: RelatedInformation[];
    mitigationHint: string;
    explanation?: string;
    contextMetadata?: ViolationContextMetadata;
    /** Human-facing explanation of why the detector trusts this finding. */
    analysisMetadata?: ViolationAnalysisMetadata;
    /** Original detector type for backward compatibility (e.g. 'business-logic', 'package-violation') */
    legacyType?: string;
    /** Original detector source identifier */
    detectorSource?: 'ServiceLayer' | 'ControllerLayer' | 'EntityLayer' | 'APIResourceLayer' | 'CrossFileAnalyzer' | 'GraphAnalyzer' | 'PackageBoundaryAnalyzer' | 'DesignPatternAnalyzer' | 'AiAdvisory';
    /** Advisory marks attached by the AI Reasoning pass (RICA-V000). Never deletes the violation. */
    aiInsights?: AiInsights;
    /** Optional actionable fix proposed by the advisory pass */
    quickFix?: AiQuickFix;
    /** Rule-based remediation generated from the violation context. */
    remediationSuggestions?: RemediationSuggestion[];
}

export interface ViolationSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}
