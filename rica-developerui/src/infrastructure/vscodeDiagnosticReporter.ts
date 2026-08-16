import * as vscode from 'vscode';
import { DiagnosticReporter } from '../application/ports/diagnosticReporter';
import { Violation } from '../domain/violations';

/**
 * Deterministic rule diagnostics and AI advisory findings go to SEPARATE VS Code
 * diagnostic collections so the two are visually distinct. Advisory findings
 * get a `RICA-AI` source and a `[RICA-AI]` message prefix.
 */
export class VscodeDiagnosticReporter implements DiagnosticReporter {
  constructor(
    private readonly collection: vscode.DiagnosticCollection,
    private readonly advisoryCollection?: vscode.DiagnosticCollection,
  ) {}

  report(violations: Violation[], ignoredIds: Set<string>): void {
    this.collection.clear();
    this.advisoryCollection?.clear();

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;
    const workspaceFolder = workspaceFolders[0];

    const ruleMap = new Map<string, Violation[]>();
    const advisoryMap = new Map<string, Violation[]>();
    for (const v of violations) {
      if (!v.filePath) continue;
      if (ignoredIds.has(v.id)) continue;
      const isAdvisory = v.detectorSource === 'AiAdvisory';
      const map = isAdvisory ? advisoryMap : ruleMap;
      const arr = map.get(v.filePath) || [];
      arr.push(v);
      map.set(v.filePath, arr);
    }

    for (const [relativePath, vlist] of ruleMap) {
      this.collection.set(workspaceUri(workspaceFolder, relativePath), toDiagnostics(vlist, false));
    }
    for (const [relativePath, vlist] of advisoryMap) {
      if (this.advisoryCollection) {
        this.advisoryCollection.set(workspaceUri(workspaceFolder, relativePath), toDiagnostics(vlist, true));
      }
    }
  }

  clear(): void {
    this.collection.clear();
    this.advisoryCollection?.clear();
  }
}

function workspaceUri(workspaceFolder: vscode.WorkspaceFolder, relativePath: string): vscode.Uri {
  return vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
}

function toDiagnostics(vlist: Violation[], advisory: boolean): vscode.Diagnostic[] {
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
    const tag = advisory ? '[RICA-AI] ' : '';
    const diag = new vscode.Diagnostic(range, `${tag}${codePrefix}${severityLabel} ${v.message}`, severity);
    diag.source = advisory ? 'RICA-AI' : 'Java Layer Analyzer';
    diag.code = v.id;
    diagnostics.push(diag);
  }
  return diagnostics;
}