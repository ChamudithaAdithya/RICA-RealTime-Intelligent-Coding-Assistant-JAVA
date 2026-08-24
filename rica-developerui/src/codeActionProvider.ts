import * as vscode from 'vscode';
import * as path from 'path';
import type { RemediationSuggestion, Violation } from './domain/violations';
import type { AiQuickFix } from './domain/ai';

/** Diagnostics with a clickable doc link carry the violation id in `code.value`. */
function diagnosticCode(diag: vscode.Diagnostic): string | number | undefined {
  return typeof diag.code === 'object' ? diag.code.value : diag.code;
}

/**
 * Surfaces violation remediation suggestions as standard VS Code Quick-Fix
 * lightbulb actions. Low-risk suggestions can carry edits; design-heavy
 * suggestions open guidance instead of applying unsafe rewrites.
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
      const violation = this.getViolations().find(v => v.id === diagnosticCode(diag));
      if (!violation) continue;

      for (const remediation of violation.remediationSuggestions || []) {
        const action = new vscode.CodeAction(
          remediation.edits?.length
            ? `RICA Fix: ${remediation.title}`
            : `RICA Guidance: ${remediation.title}`,
          vscode.CodeActionKind.QuickFix,
        );
        action.diagnostics = [diag];
        if (remediation.edits?.length) {
          action.isPreferred = remediation.safety === 'auto-safe' || remediation.safety === 'preview-required';
          action.edit = this.buildWorkspaceEdit(document, {
            title: remediation.title,
            description: remediation.description,
            edits: remediation.edits,
          });
        } else {
          action.command = {
            title: remediation.title,
            command: 'javaAstAnalyzer.showFixGuidance',
            arguments: [violation, remediation],
          };
        }
        actions.push(action);
      }

      const quickFix = violation.quickFix ?? violation.aiInsights?.quickFix;
      if (quickFix?.edits?.length && !this.hasSameEditAction(actions, quickFix)) {
        const action = new vscode.CodeAction(
          `AI Quick Fix: ${quickFix.title}`,
          vscode.CodeActionKind.QuickFix,
        );
        action.isPreferred = true;
        action.diagnostics = [diag];
        action.edit = this.buildWorkspaceEdit(document, quickFix);
        actions.push(action);
      }
    }
    return actions;
  }

  private hasSameEditAction(actions: vscode.CodeAction[], quickFix: AiQuickFix): boolean {
    return actions.some(action => action.title.includes(quickFix.title) && !!action.edit);
  }

  private buildWorkspaceEdit(document: vscode.TextDocument, quickFix: AiQuickFix): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    for (const e of quickFix.edits) {
      const sameFile = this.isSameFile(document, e.filePath);
      const uri = sameFile
        ? document.uri
        : root
          ? vscode.Uri.from({ scheme: 'file', path: path.join(root, e.filePath) })
          : document.uri;

      const zeroBased = Math.max(0, e.line - 1);
      // Line-end position: exact for the current document, best-effort otherwise.
      const endOfLine = () => {
        if (sameFile) return document.lineAt(zeroBased).range.end;
        return new vscode.Position(zeroBased, 100000);
      };

      switch (e.kind) {
        case 'insertBefore':
          // Prepend a newline so annotation text lands on its own line.
          edit.insert(uri, new vscode.Position(zeroBased, 0), `${e.text}\n`);
          break;
        case 'insertAfter':
          edit.insert(uri, endOfLine(), `\n${e.text}`);
          break;
        case 'replace':
          edit.replace(uri, new vscode.Range(new vscode.Position(zeroBased, 0), endOfLine()), e.text);
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

export async function showFixGuidance(violation: Violation, remediation: RemediationSuggestion): Promise<void> {
  const hasEdit = remediation.edits?.length ? 'Yes, previewable editor edit is available.' : 'No automatic edit is applied. This needs a design decision.';
  const safetyMeaning = remediation.safety === 'auto-safe'
    ? 'Mechanical edit with low risk.'
    : remediation.safety === 'preview-required'
      ? 'RICA can prepare an edit, but you should review imports, naming, and project conventions.'
      : 'Do not auto-apply. Use the steps as a refactoring plan.';
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: [
      `# ${remediation.title}`,
      '',
      `**Rule:** ${violation.code || violation.ruleName}`,
      `**Safety:** ${remediation.safety}`,
      `**Meaning:** ${safetyMeaning}`,
      `**Automatic edit:** ${hasEdit}`,
      `**Location:** ${violation.filePath}${violation.lineNumber ? `:${violation.lineNumber}` : ''}`,
      '',
      '## What Is Wrong',
      '',
      violation.message,
      '',
      '## Recommended Fix',
      '',
      remediation.description,
      '',
      '## Exact Steps',
      '',
      ...remediation.steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      '## Review Before Applying',
      '',
      '- Does this match the project injection/refactoring style?',
      '- Are imports, annotations, and package boundaries still correct?',
      '- For manual-design fixes, choose the smallest refactor that restores the intended architecture.',
    ].join('\n'),
  });
  await vscode.window.showTextDocument(doc, { preview: true });
}
