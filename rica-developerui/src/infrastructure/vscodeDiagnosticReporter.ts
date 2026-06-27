import * as vscode from 'vscode';
import { DiagnosticReporter } from '../application/ports/diagnosticReporter';
import { Violation } from '../domain/violations';

export class VscodeDiagnosticReporter implements DiagnosticReporter {
  constructor(private readonly collection: vscode.DiagnosticCollection) {}

  report(violations: Violation[], ignoredIds: Set<string>): void {
    this.collection.clear();
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;
    const workspaceFolder = workspaceFolders[0];

    const fileMap = new Map<string, Violation[]>();
    for (const v of violations) {
      if (!v.filePath) continue;
      if (ignoredIds.has(v.id)) continue;
      const arr = fileMap.get(v.filePath) || [];
      arr.push(v);
      fileMap.set(v.filePath, arr);
    }

    for (const [relativePath, vlist] of fileMap) {
      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
      const diagnostics: vscode.Diagnostic[] = [];
      for (const v of vlist) {
        let severity: vscode.DiagnosticSeverity;
        switch (v.severity) {
          case 'error': severity = vscode.DiagnosticSeverity.Error; break;
          case 'warning': severity = vscode.DiagnosticSeverity.Warning; break;
          default: severity = vscode.DiagnosticSeverity.Information; break;
        }
        let range: vscode.Range;
        if (v.range) {
          range = new vscode.Range(
            v.range.start.line - 1, v.range.start.character,
            v.range.end.line - 1, v.range.end.character,
          );
        } else if (v.lineNumber) {
          range = new vscode.Range(v.lineNumber - 1, 0, v.lineNumber - 1, 0);
        } else {
          range = new vscode.Range(0, 0, 0, 0);
        }
        const severityLabel = v.severity === 'error' ? '[Error]' : v.severity === 'warning' ? '[Warning]' : '[Info]';
        const codePrefix = v.code ? `[${v.code}] ` : '';
        const diag = new vscode.Diagnostic(range, `${codePrefix}${severityLabel} ${v.message}`, severity);
        diag.source = 'Java Layer Analyzer';
        diag.code = v.id;
        diagnostics.push(diag);
      }
      this.collection.set(fileUri, diagnostics);
    }
  }

  clear(): void {
    this.collection.clear();
  }
}
