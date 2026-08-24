import { Violation } from '../../domain/violations';

export interface DiagnosticReporter {
  report(violations: Violation[], ignoredIds: Set<string>): void;
  clearFile(filePath: string): void;
  clear(): void;
}
