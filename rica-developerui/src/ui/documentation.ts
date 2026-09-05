import * as path from 'path';
import * as vscode from 'vscode';
import { DocumentationWebviewPanel } from './documentationWebviewPanel';

function markdownPathFromTarget(target?: string): string[] {
    let docPath = target || '/index.html';

    if (/^command:/i.test(docPath)) {
        try {
            const commandUri = vscode.Uri.parse(docPath);
            const args = commandUri.query ? JSON.parse(decodeURIComponent(commandUri.query)) : [];
            docPath = typeof args?.[0] === 'string' ? args[0] : '/index.html';
        } catch {
            docPath = '/index.html';
        }
    }

    // Diagnostic links may arrive as a command URI, a web URL, or a plain
    // route. Normalize all three to the packaged VitePress page path.
    try {
        docPath = decodeURIComponent(docPath);
    } catch {
        // Keep the original route when it contains malformed escape sequences.
    }

    const violationCode = docPath.match(/(?:^|[^A-Z0-9])(RICA-V\d{3})(?:[^A-Z0-9]|$)/i)?.[1];
    if (violationCode) {
        docPath = `/violations/${violationCode.toUpperCase()}.html`;
    }

    if (/^https?:\/\//i.test(docPath)) {
        try {
            docPath = new URL(docPath).pathname;
        } catch {
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

export async function openRicaDocumentation(extensionUri: vscode.Uri, target?: string): Promise<void> {
    const parts = markdownPathFromTarget(target);
    const route = parts.slice(1).join('/').replace(/\.md$/i, '.html');
    const distRoot = vscode.Uri.joinPath(extensionUri, 'docs', '.vitepress', 'dist');
    const routeUri = vscode.Uri.joinPath(distRoot, route || 'index.html');
    const fallbackUri = vscode.Uri.joinPath(distRoot, 'index.html');

    try {
        await vscode.workspace.fs.stat(routeUri);
        DocumentationWebviewPanel.createOrShow(extensionUri, routeUri);
    } catch {
        DocumentationWebviewPanel.createOrShow(extensionUri, fallbackUri);
    }
}
