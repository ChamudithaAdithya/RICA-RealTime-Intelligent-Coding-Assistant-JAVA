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
exports.openRicaDocumentation = openRicaDocumentation;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
function markdownPathFromTarget(target) {
    let docPath = target || '/index.html';
    if (/^https?:\/\//i.test(docPath)) {
        try {
            docPath = new URL(docPath).pathname;
        }
        catch {
            return ['docs', 'index.md'];
        }
    }
    docPath = docPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!docPath || docPath === 'index.html' || docPath === 'index.md') {
        return ['docs', 'index.md'];
    }
    docPath = docPath.replace(/\.html$/i, '.md');
    if (!docPath.endsWith('.md')) {
        docPath += '.md';
    }
    const parts = docPath.split('/').filter(Boolean);
    if (parts.includes('..') || parts.some(part => path.isAbsolute(part))) {
        return ['docs', 'index.md'];
    }
    return ['docs', ...parts];
}
async function openRicaDocumentation(extensionUri, target) {
    const parts = markdownPathFromTarget(target);
    const uri = vscode.Uri.joinPath(extensionUri, ...parts);
    try {
        await vscode.workspace.fs.stat(uri);
        await vscode.commands.executeCommand('markdown.showPreview', uri);
    }
    catch {
        const fallback = vscode.Uri.joinPath(extensionUri, 'docs', 'index.md');
        await vscode.commands.executeCommand('markdown.showPreview', fallback);
    }
}
//# sourceMappingURL=documentation.js.map