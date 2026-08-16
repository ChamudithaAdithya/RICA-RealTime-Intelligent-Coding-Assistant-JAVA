import * as vscode from 'vscode';
import * as path from 'path';
import { Violation } from './domain/violations';
import { AiQuickFix } from './domain/ai';

/**
 * Surfaces violation `quickFix` edits (produced by the AI Reasoning module) as
 * standard VS Code Quick-Fix lightbulb actions on the offending diagnostic.
 */
export class AiQuickFixCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  constructor(private readonly getViolations: () => Violation[]) {}

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    for (const diag of context.diagnostics) {
      const violation = this.getViolations().find(v => v.id === diag.code);
      const quickFix = violation?.quickFix ?? violation?.aiInsights?.quickFix;
      if (!quickFix?.edits?.length) continue;

      const action = new vscode.CodeAction(
        `AI Quick Fix: ${quickFix.title}`,
        vscode.CodeActionKind.QuickFix,
      );
      action.isPreferred = true;
      action.diagnostics = [diag];
      action.edit = this.buildWorkspaceEdit(document, quickFix);
      action.detail = quickFix.description;
      actions.push(action);
    }
    return actions;
  }

  private buildWorkspaceEdit(document: vscode.TextDocument, quickFix: AiQuickFix): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    for (const e of quickFix.edits) {
      const uri = this.isSameFile(document, e.filePath)
        ? document.uri
        : root
          ? vscode.Uri.from({ scheme: 'file', path: path.join(root, e.filePath) })
          : document.uri;

      const zeroBased = Math.max(0, e.line - 1);
      switch (e.kind) {
        case 'insertBefore':
          // Prepend a newline so annotation text lands on its own line.
          edit.insert(uri, new vscode.Position(zeroBased, 0), `${e.text}\n`);
          break;
        case 'insertAfter':
          edit.insert(uri, new vscode.Position(zeroBased, Number.MAX_SAFE_INTEGER), `\n${e.text}`);
          break;
        case 'replace':
          edit.replace(uri, new vscode.Range(zeroBased, 0, zeroBased, Number.MAX_SAFE_INTEGER), e.text);
          break;
      }
    }
    return edit;
  }

  private isSameFile(document: vscode.TextDocument, filePath: string): boolean {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return false;
    const abs = path.join(root, filePath);
    try {
      return path.resolve(document.uri.fsPath) === path.resolve(abs);
    } catch {
      return false;
    }
  }
}