import * as vscode from 'vscode';
import { DocumentationWebviewPanel } from './documentationWebviewPanel';

function htmlRouteFromTarget(target?: string): string {
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
        return `violations/${violationCode.toUpperCase()}.html`;
    }

    if (/^https?:\/\//i.test(docPath)) {
        try {
            docPath = new URL(docPath).pathname;
        } catch {
            return 'index.html';
        }
    }

    docPath = docPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!docPath || docPath === 'index.html' || docPath === 'index.md') {
        return 'index.html';
    }

    if (docPath.endsWith('/')) {
        docPath += 'index.html';
    } else if (docPath.endsWith('.md')) {
        docPath = docPath.replace(/\.md$/i, '.html');
    } else if (!docPath.endsWith('.html')) {
        docPath += '.html';
    }

    const parts = docPath.split('/').filter(Boolean);
    if (parts.includes('..') || parts.some(part => /^[A-Za-z]:$/.test(part))) {
        return 'index.html';
    }
    return parts.join('/');
}

export async function openRicaDocumentation(extensionUri: vscode.Uri, target?: string): Promise<void> {
    const route = htmlRouteFromTarget(target);
    const distRoot = vscode.Uri.joinPath(extensionUri, 'docs', '.vitepress', 'dist');
    const routeUri = vscode.Uri.joinPath(distRoot, ...route.split('/'));
    const fallbackUri = vscode.Uri.joinPath(distRoot, 'index.html');

    try {
        await vscode.workspace.fs.stat(routeUri);
        DocumentationWebviewPanel.createOrShow(extensionUri, routeUri);
    } catch {
        DocumentationWebviewPanel.createOrShow(extensionUri, fallbackUri);
    }
}
