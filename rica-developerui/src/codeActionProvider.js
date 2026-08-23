"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiQuickFixCodeActionProvider = void 0;
exports.showFixGuidance = showFixGuidance;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/** Diagnostics with a clickable doc link carry the violation id in `code.value`. */
function diagnosticCode(diag) {
    return typeof diag.code === 'object' ? diag.code.value : diag.code;
}
/**
 * Surfaces violation remediation suggestions as standard VS Code Quick-Fix
 * lightbulb actions. Low-risk suggestions can carry edits; design-heavy
 * suggestions open guidance instead of applying unsafe rewrites.
 */
class AiQuickFixCodeActionProvider {
    constructor(getViolations) {
        this.getViolations = getViolations;
    }
    provideCodeActions(document, _range, context) {
        const actions = [];
        for (const diag of context.diagnostics) {
            const violation = this.getViolations().find(v => v.id === diagnosticCode(diag));
            if (!violation)
                continue;
            for (const remediation of violation.remediationSuggestions || []) {
                const action = new vscode.CodeAction(remediation.edits?.length
                    ? `RICA Fix: ${remediation.title}`
                    : `RICA Guidance: ${remediation.title}`, vscode.CodeActionKind.QuickFix);
                action.diagnostics = [diag];
                if (remediation.edits?.length) {
                    action.isPreferred = remediation.safety === 'auto-safe' || remediation.safety === 'preview-required';
                    action.edit = this.buildWorkspaceEdit(document, {
                        title: remediation.title,
                        description: remediation.description,
                        edits: remediation.edits,
                    });
                }
                else {
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
                const action = new vscode.CodeAction(`AI Quick Fix: ${quickFix.title}`, vscode.CodeActionKind.QuickFix);
                action.isPreferred = true;
                action.diagnostics = [diag];
                action.edit = this.buildWorkspaceEdit(document, quickFix);
                actions.push(action);
            }
        }
        return actions;
    }
    hasSameEditAction(actions, quickFix) {
        return actions.some(action => action.title.includes(quickFix.title) && !!action.edit);
    }
    buildWorkspaceEdit(document, quickFix) {
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
                if (sameFile)
                    return document.lineAt(zeroBased).range.end;
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
    isSameFile(document, filePath) {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root)
            return false;
        const abs = path.join(root, filePath);
        try {
            return path.resolve(document.uri.fsPath) === path.resolve(abs);
        }
        catch {
            return false;
        }
    }
}
exports.AiQuickFixCodeActionProvider = AiQuickFixCodeActionProvider;
AiQuickFixCodeActionProvider.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
async function showFixGuidance(violation, remediation) {
    const doc = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: [
            `# ${remediation.title}`,
            '',
            `**Rule:** ${violation.code || violation.ruleName}`,
            `**Safety:** ${remediation.safety}`,
            `**Location:** ${violation.filePath}${violation.lineNumber ? `:${violation.lineNumber}` : ''}`,
            '',
            remediation.description,
            '',
            '## Steps',
            '',
            ...remediation.steps.map((step, index) => `${index + 1}. ${step}`),
            '',
            '## Evidence',
            '',
            violation.message,
        ].join('\n'),
    });
    await vscode.window.showTextDocument(doc, { preview: true });
}
//# sourceMappingURL=codeActionProvider.js.map