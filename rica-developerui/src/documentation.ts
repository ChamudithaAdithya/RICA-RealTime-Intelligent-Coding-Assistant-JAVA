import * as path from 'path';
import * as vscode from 'vscode';

function markdownPathFromTarget(target?: string): string[] {
    let docPath = target || '/index.html';

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
    const uri = vscode.Uri.joinPath(extensionUri, ...parts);
    try {
        await vscode.workspace.fs.stat(uri);
        await vscode.commands.executeCommand('markdown.showPreview', uri);
    } catch {
        const fallback = vscode.Uri.joinPath(extensionUri, 'docs', 'index.md');
        await vscode.commands.executeCommand('markdown.showPreview', fallback);
    }
}
