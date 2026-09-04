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
const documentationWebviewPanel_1 = require("./documentationWebviewPanel");
function markdownPathFromTarget(target) {
    let docPath = target || '/index.html';
    if (/^command:/i.test(docPath)) {
        try {
            const commandUri = vscode.Uri.parse(docPath);
            const args = commandUri.query ? JSON.parse(decodeURIComponent(commandUri.query)) : [];
            docPath = typeof args?.[0] === 'string' ? args[0] : '/index.html';
        }
        catch {
            docPath = '/index.html';
        }
    }
    // Diagnostic links may arrive as a command URI, a web URL, or a plain
    // route. Normalize all three to the packaged VitePress page path.
    try {
        docPath = decodeURIComponent(docPath);
    }
    catch {
        // Keep the original route when it contains malformed escape sequences.
    }
    const violationCode = docPath.match(/(?:^|[^A-Z0-9])(RICA-V\d{3})(?:[^A-Z0-9]|$)/i)?.[1];
    if (violationCode) {
        docPath = `/violations/${violationCode.toUpperCase()}.html`;
    }
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
    const route = parts.slice(1).join('/').replace(/\.md$/i, '.html');
    const distRoot = vscode.Uri.joinPath(extensionUri, 'docs', '.vitepress', 'dist');
    const routeUri = vscode.Uri.joinPath(distRoot, route || 'index.html');
    const fallbackUri = vscode.Uri.joinPath(distRoot, 'index.html');
    try {
        await vscode.workspace.fs.stat(routeUri);
        documentationWebviewPanel_1.DocumentationWebviewPanel.createOrShow(extensionUri, routeUri);
    }
    catch {
        documentationWebviewPanel_1.DocumentationWebviewPanel.createOrShow(extensionUri, fallbackUri);
    }
}
//# sourceMappingURL=documentation.js.map