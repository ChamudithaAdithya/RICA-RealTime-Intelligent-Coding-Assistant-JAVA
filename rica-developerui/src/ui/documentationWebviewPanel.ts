import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class DocumentationWebviewPanel {
    public static currentPanel: DocumentationWebviewPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private readonly disposables: vscode.Disposable[] = [];
    private routeUri: vscode.Uri;

    public static createOrShow(extensionUri: vscode.Uri, routeUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.Two;

        if (DocumentationWebviewPanel.currentPanel) {
            DocumentationWebviewPanel.currentPanel.routeUri = routeUri;
            DocumentationWebviewPanel.currentPanel.panel.reveal(column);
            DocumentationWebviewPanel.currentPanel.update();
            return;
        }

        const distRoot = vscode.Uri.joinPath(extensionUri, 'docs', '.vitepress', 'dist');
        const panel = vscode.window.createWebviewPanel(
            'ricaDocumentation',
            'RICA Documentation',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [distRoot],
            },
        );

        DocumentationWebviewPanel.currentPanel = new DocumentationWebviewPanel(panel, extensionUri, routeUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, routeUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.routeUri = routeUri;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(
            message => {
                if (message?.command === 'openRoute' && typeof message.route === 'string') {
                    this.openRoute(message.route);
                }
            },
            null,
            this.disposables,
        );
        this.update();
    }

    private openRoute(route: string): void {
        const distRoot = vscode.Uri.joinPath(this.extensionUri, 'docs', '.vitepress', 'dist');
        const currentRoute = path.relative(distRoot.fsPath, this.routeUri.fsPath).replace(/\\/g, '/');
        const currentDirectory = path.posix.dirname(currentRoute);
        const cleanRoute = route.split('#', 1)[0].split('?', 1)[0];
        if (!cleanRoute) return;
        const normalized = cleanRoute.replace(/\\/g, '/');
        const routePath = normalized.endsWith('.html') ? normalized : `${normalized}.html`;
        const candidate = path.posix.normalize(
            normalized.startsWith('/') ? routePath.slice(1) : path.posix.join(currentDirectory, routePath),
        );
        if (candidate === '..' || candidate.startsWith('../')) return;

        const routeUri = vscode.Uri.joinPath(distRoot, ...candidate.split('/'));
        try {
            if (fs.existsSync(routeUri.fsPath)) {
                this.routeUri = routeUri;
                this.update();
            }
        } catch {
            // Keep the current page open when a link is not part of the package.
        }
    }

    private update(): void {
        this.panel.title = 'RICA Documentation';
        this.panel.webview.html = this.getHtml();
    }

    private getHtml(): string {
        const distRoot = vscode.Uri.joinPath(this.extensionUri, 'docs', '.vitepress', 'dist');
        const indexPath = this.routeUri.fsPath || path.join(distRoot.fsPath, 'index.html');
        let pageTitle = 'RICA Documentation';
        let pageHtml = '';
        try {
            pageHtml = fs.readFileSync(indexPath, 'utf8');
            const match = pageHtml.match(/<title>([^<]+)<\/title>/i);
            if (match) pageTitle = match[1];
        } catch {
            pageHtml = '<main><h1>RICA Documentation</h1><p>The bundled documentation could not be loaded.</p></main>';
        }

        const csp = [
            "default-src 'none'",
            `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
            `script-src ${this.panel.webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
            `img-src ${this.panel.webview.cspSource} data:`,
            `font-src ${this.panel.webview.cspSource} data:`,
        ].join('; ');

        const route = path.relative(distRoot.fsPath, this.routeUri.fsPath).replace(/\\/g, '/');
        const pageDirectory = path.posix.dirname(route);
        const resourceUrl = (attribute: string, raw: string): string => {
            if (/^(?:data:|https?:|#|mailto:|javascript:)/i.test(raw)) return raw;
            if (attribute.toLowerCase() === 'href' && (/\.html(?:#.*)?$/i.test(raw) || /^\//.test(raw))) {
                return raw;
            }
            const normalized = raw.replace(/\\/g, '/');
            const candidate = normalized.startsWith('/')
                ? normalized.slice(1)
                : normalized.startsWith('./assets/') || normalized === './vp-icons.css'
                    ? normalized.slice(2)
                    : path.posix.normalize(path.posix.join(pageDirectory, normalized));
            const resourcePath = path.posix.normalize(candidate).replace(/^\.\//, '');
            if (resourcePath === '..' || resourcePath.startsWith('../')) return raw;
            const uri = vscode.Uri.joinPath(distRoot, ...resourcePath.split('/'));
            return this.panel.webview.asWebviewUri(uri).toString();
        };

        pageHtml = pageHtml.replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '');
        pageHtml = pageHtml.replace(/<script\b[^>]*src=["'][^"']+["'][^>]*><\/script>/gi, '');
        pageHtml = pageHtml.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
        pageHtml = pageHtml.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (_match, attribute, quote, raw) =>
            `${attribute}=${quote}${resourceUrl(attribute, raw)}${quote}`,
        );

        const navigationScript = `<script>
            (function () {
                const vscode = acquireVsCodeApi();
                document.addEventListener('click', function (event) {
                    const link = event.target.closest && event.target.closest('a[href]');
                    if (!link) return;
                    const href = link.getAttribute('href') || '';
                    if (href.startsWith('/') || href.endsWith('.html') || href.endsWith('.html#')) {
                        event.preventDefault();
                        vscode.postMessage({ command: 'openRoute', route: href });
                    }
                }, true);
            }());
        </script>`;

        return pageHtml
            .replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`)
            .replace(/<\/body>/i, `${navigationScript}</body>`)
            .replace(/<title>[^<]*<\/title>/i, `<title>${this.escapeHtml(pageTitle)}</title>`);
    }

    private escapeHtml(value: string): string {
        return value.replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[character] || character));
    }

    private dispose(): void {
        DocumentationWebviewPanel.currentPanel = undefined;
        while (this.disposables.length) {
            this.disposables.pop()?.dispose();
        }
    }
}