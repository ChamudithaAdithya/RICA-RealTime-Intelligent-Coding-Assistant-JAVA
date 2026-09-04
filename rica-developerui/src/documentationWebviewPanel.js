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
exports.DocumentationWebviewPanel = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class DocumentationWebviewPanel {
    static createOrShow(extensionUri, routeUri) {
        const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.Two;
        if (DocumentationWebviewPanel.currentPanel) {
            DocumentationWebviewPanel.currentPanel.routeUri = routeUri;
            DocumentationWebviewPanel.currentPanel.panel.reveal(column);
            DocumentationWebviewPanel.currentPanel.update();
            return;
        }
        const distRoot = vscode.Uri.joinPath(extensionUri, 'docs', '.vitepress', 'dist');
        const panel = vscode.window.createWebviewPanel('ricaDocumentation', 'RICA Documentation', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [distRoot],
        });
        DocumentationWebviewPanel.currentPanel = new DocumentationWebviewPanel(panel, extensionUri, routeUri);
    }
    constructor(panel, extensionUri, routeUri) {
        this.disposables = [];
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.routeUri = routeUri;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(message => {
            if (message?.command === 'openRoute' && typeof message.route === 'string') {
                this.openRoute(message.route);
            }
        }, null, this.disposables);
        this.update();
    }
    openRoute(route) {
        const distRoot = vscode.Uri.joinPath(this.extensionUri, 'docs', '.vitepress', 'dist');
        const currentRoute = path.relative(distRoot.fsPath, this.routeUri.fsPath).replace(/\\/g, '/');
        const currentDirectory = path.posix.dirname(currentRoute);
        const cleanRoute = route.split('#', 1)[0].split('?', 1)[0];
        if (!cleanRoute)
            return;
        const normalized = cleanRoute.replace(/\\/g, '/');
        const routePath = normalized.endsWith('.html') ? normalized : `${normalized}.html`;
        const candidate = path.posix.normalize(normalized.startsWith('/') ? routePath.slice(1) : path.posix.join(currentDirectory, routePath));
        if (candidate === '..' || candidate.startsWith('../'))
            return;
        const routeUri = vscode.Uri.joinPath(distRoot, ...candidate.split('/'));
        try {
            if (fs.existsSync(routeUri.fsPath)) {
                this.routeUri = routeUri;
                this.update();
            }
        }
        catch {
            // Keep the current page open when a link is not part of the package.
        }
    }
    update() {
        this.panel.title = 'RICA Documentation';
        this.panel.webview.html = this.getHtml();
    }
    getHtml() {
        const distRoot = vscode.Uri.joinPath(this.extensionUri, 'docs', '.vitepress', 'dist');
        const indexPath = this.routeUri.fsPath || path.join(distRoot.fsPath, 'index.html');
        let pageTitle = 'RICA Documentation';
        let pageHtml = '';
        try {
            pageHtml = fs.readFileSync(indexPath, 'utf8');
            const match = pageHtml.match(/<title>([^<]+)<\/title>/i);
            if (match)
                pageTitle = match[1];
        }
        catch {
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
        const resourceUrl = (attribute, raw) => {
            if (/^(?:data:|https?:|#|mailto:|javascript:)/i.test(raw))
                return raw;
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
            if (resourcePath === '..' || resourcePath.startsWith('../'))
                return raw;
            const uri = vscode.Uri.joinPath(distRoot, ...resourcePath.split('/'));
            return this.panel.webview.asWebviewUri(uri).toString();
        };
        pageHtml = pageHtml.replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '');
        pageHtml = pageHtml.replace(/<script\b[^>]*src=["'][^"']+["'][^>]*><\/script>/gi, '');
        pageHtml = pageHtml.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
        pageHtml = pageHtml.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (_match, attribute, quote, raw) => `${attribute}=${quote}${resourceUrl(attribute, raw)}${quote}`);
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
    escapeHtml(value) {
        return value.replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[character] || character));
    }
    dispose() {
        DocumentationWebviewPanel.currentPanel = undefined;
        while (this.disposables.length) {
            this.disposables.pop()?.dispose();
        }
    }
}
exports.DocumentationWebviewPanel = DocumentationWebviewPanel;
//# sourceMappingURL=documentationWebviewPanel.js.map