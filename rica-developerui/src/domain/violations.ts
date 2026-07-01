export type ViolationSeverity = 'error' | 'warning' | 'info';

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
    /** Precise source range for editor highlighting */
    range?: DiagnosticRange;
    /** Cross-file trace links */
    relatedInformation?: RelatedInformation[];
    mitigationHint: string;
    explanation?: string;
    contextMetadata?: ViolationContextMetadata;
    /** Original detector type for backward compatibility (e.g. 'business-logic', 'package-violation') */
    legacyType?: string;
    /** Original detector source identifier */
    detectorSource?: 'ServiceLayer' | 'ControllerLayer' | 'EntityLayer' | 'APIResourceLayer' | 'CrossFileAnalyzer' | 'GraphAnalyzer' | 'PackageBoundaryAnalyzer' | 'DesignPatternAnalyzer';
}

export interface ViolationSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}
