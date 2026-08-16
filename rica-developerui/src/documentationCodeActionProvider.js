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
exports.DocumentationCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
function diagnosticDocTarget(diag) {
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
class DocumentationCodeActionProvider {
    provideCodeActions(document, _range, context) {
        const actions = [];
        const targets = new Set();
        for (const diag of context.diagnostics) {
            const target = diagnosticDocTarget(diag);
            if (!target || targets.has(target.toString()))
                continue;
            targets.add(target.toString());
            const action = new vscode.CodeAction('Open RICA documentation', vscode.CodeActionKind.QuickFix);
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
exports.DocumentationCodeActionProvider = DocumentationCodeActionProvider;
DocumentationCodeActionProvider.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
//# sourceMappingURL=documentationCodeActionProvider.js.map