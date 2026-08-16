import * as vscode from 'vscode';

function diagnosticDocTarget(diag: vscode.Diagnostic): vscode.Uri | undefined {
  if (typeof diag.code === 'object' && diag.code.target) {
    return diag.code.target;
  }
  return undefined;
}

/**
 * Adds a quick-fix "Open RICA documentation" on any diagnostic that carries a
 * clickable doc link (the `target` in `Diagnostic.code`). Lets users jump from
 * a realtime violation alert straight to the rule's docs page.
 */
export class DocumentationCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const targets = new Set<string>();
    for (const diag of context.diagnostics) {
      const target = diagnosticDocTarget(diag);
      if (!target || targets.has(target.toString())) continue;
      targets.add(target.toString());
      const action = new vscode.CodeAction(
        'Open RICA documentation',
        vscode.CodeActionKind.QuickFix,
      );
      action.command = {
        title: 'Open RICA documentation',
        command: 'javaAstAnalyzer.openDocumentation',
        arguments: [target.toString()],
      };
      actions.push(action);
    }
    return actions;
  }
}