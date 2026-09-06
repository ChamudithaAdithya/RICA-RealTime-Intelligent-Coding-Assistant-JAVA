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
      const uri = workspaceUri(workspaceFolder, relativePath);
      this.collection.set(uri, toDiagnostics(vlist, false, uri));
    }
    for (const [relativePath, vlist] of advisoryMap) {
      if (this.advisoryCollection) {
        const uri = workspaceUri(workspaceFolder, relativePath);
        this.advisoryCollection.set(uri, toDiagnostics(vlist, true, uri));
      }
    }
  }

  clear(): void {
    this.collection.clear();
    this.advisoryCollection?.clear();
  }

  clearFile(filePath: string): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;
    const uri = workspaceUri(workspaceFolders[0], filePath);
    this.collection.delete(uri);
    this.advisoryCollection?.delete(uri);
  }
}

function workspaceUri(workspaceFolder: vscode.WorkspaceFolder, relativePath: string): vscode.Uri {
  return vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
}

function toDiagnostics(vlist: Violation[], advisory: boolean, uri: vscode.Uri): vscode.Diagnostic[] {
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
    if (v.analysisMetadata) {
      diag.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(new vscode.Location(uri, range), `Confidence: ${v.analysisMetadata.confidence}`),
        new vscode.DiagnosticRelatedInformation(new vscode.Location(uri, range), `Evidence: ${v.analysisMetadata.evidence}`),
        new vscode.DiagnosticRelatedInformation(new vscode.Location(uri, range), `Reason: ${v.analysisMetadata.reason}`),
        new vscode.DiagnosticRelatedInformation(new vscode.Location(uri, range), `Type: ${v.analysisMetadata.type}`),
      ];
    }
    // Always route documentation through the packaged Webview. This prevents
    // VS Code from treating a generated .html path as a workspace file.
    if (!advisory && v.documentationUrl) {
      // Use the extension URI handler because Problems-panel diagnostic code
      // targets are opened as URIs, not reliably executed as commands.
      const extensionAuthority = 'Geeth-Chamuditha-Adithya-Herath.rica-realtime-code-violations-analyzer';
      const target = vscode.Uri.parse(`vscode://${extensionAuthority}/${v.code || 'RICA-V000'}`);
      diag.code = { value: v.id, target };
    } else {
      diag.code = v.id;
    }
    diagnostics.push(diag);
  }
  return diagnostics;
}
