import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

type SearchEntry = {
    title: string;
    route: string;
    text: string;
};

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
        const candidate = this.resolveRouteCandidate(cleanRoute, currentDirectory);
        if (!candidate || candidate === '404.html' || candidate === '..' || candidate.startsWith('../')) return;

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

    private resolveRouteCandidate(route: string, currentDirectory: string): string | undefined {
        const normalized = route.replace(/\\/g, '/').trim();
        if (!normalized || normalized.startsWith('#')) return undefined;

        const routePath = this.toHtmlRoutePath(normalized);
        const candidate = this.isRootDocumentationRoute(normalized)
            ? routePath.replace(/^\.\//, '').replace(/^\//, '')
            : normalized.startsWith('/')
                ? routePath.slice(1)
                : path.posix.join(currentDirectory, routePath);

        return path.posix.normalize(candidate).replace(/^\.\//, '');
    }

    private isRootDocumentationRoute(route: string): boolean {
        const withoutLeadingDot = route.replace(/^\.\//, '').replace(/^\//, '');
        if (!withoutLeadingDot || withoutLeadingDot === '.') return true;
        return /^(?:rule-matrix|rule-concept-map|RICA-extension-architecture-roadmap)(?:\.html)?$/i.test(withoutLeadingDot)
            || /^(?:concepts|guides|violations)(?:\/|$)/i.test(withoutLeadingDot);
    }

    private toHtmlRoutePath(route: string): string {
        const withoutLeadingDot = route.replace(/^\.\//, '');
        if (!withoutLeadingDot || withoutLeadingDot === '.' || withoutLeadingDot === './' || withoutLeadingDot === '/') {
            return 'index.html';
        }
        if (withoutLeadingDot.endsWith('/')) {
            return `${withoutLeadingDot}index.html`;
        }
        if (withoutLeadingDot.endsWith('.html')) {
            return withoutLeadingDot;
        }
        return `${withoutLeadingDot}.html`;
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

        pageHtml = this.removeVitePressRuntime(pageHtml);

        const csp = [
            "default-src 'none'",
            `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
            `script-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
            `img-src ${this.panel.webview.cspSource} data:`,
            `font-src ${this.panel.webview.cspSource} data:`,
        ].join('; ');

        const route = path.relative(distRoot.fsPath, this.routeUri.fsPath).replace(/\\/g, '/');
        const pageDirectory = path.posix.dirname(route);
        const resourceUrl = (attribute: string, raw: string): string => {
            if (/^(?:data:|https?:|#|mailto:|javascript:)/i.test(raw)) return raw;
            if (attribute.toLowerCase() === 'href' && this.isInternalDocumentationHref(raw)) {
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

        pageHtml = pageHtml.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (_match, attribute, quote, raw) =>
            `${attribute}=${quote}${resourceUrl(attribute, raw)}${quote}`,
        );

        const searchIndex = this.buildSearchIndex(distRoot.fsPath);
        return pageHtml
            .replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${csp}">${this.getStaticEnhancementsStyle()}`)
            .replace(/<\/body>/i, `${this.getStaticEnhancementsScript(searchIndex)}</body>`)
            .replace(/<title>[^<]*<\/title>/i, `<title>${this.escapeHtml(pageTitle)}</title>`);
    }

    private removeVitePressRuntime(pageHtml: string): string {
        return pageHtml
            .replace(/<link\b[^>]*rel=(['"])modulepreload\1[^>]*>/gi, '')
            .replace(/<script\b[\s\S]*?<\/script>/gi, '');
    }

    private isInternalDocumentationHref(raw: string): boolean {
        if (/^(?:data:|https?:|mailto:|javascript:|#)/i.test(raw)) return false;
        const pathOnly = raw.split('#', 1)[0].split('?', 1)[0];
        if (!pathOnly) return true;
        if (pathOnly.endsWith('.html') || pathOnly.endsWith('/')) return true;
        if (/^(?:\.\/|\.\.\/|\/)/.test(pathOnly) && !/\.[a-z0-9]+$/i.test(pathOnly)) return true;
        return false;
    }

    private buildSearchIndex(distRoot: string): SearchEntry[] {
        try {
            return this.walkHtmlFiles(distRoot)
                .filter(filePath => path.basename(filePath).toLowerCase() !== '404.html')
                .sort((a, b) => a.localeCompare(b))
                .map(filePath => {
                    const html = fs.readFileSync(filePath, 'utf8');
                    const relative = path.relative(distRoot, filePath).replace(/\\/g, '/');
                    return {
                        title: this.extractTitle(html, relative),
                        route: relative,
                        text: this.extractSearchText(html).slice(0, 4000),
                    };
                });
        } catch {
            return [];
        }
    }

    private walkHtmlFiles(directory: string): string[] {
        const entries = fs.readdirSync(directory, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.walkHtmlFiles(entryPath));
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
                files.push(entryPath);
            }
        }
        return files;
    }

    private extractTitle(html: string, fallback: string): string {
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1) return this.stripHtml(h1[1]);
        const title = html.match(/<title>([^<]+)<\/title>/i);
        if (title) return this.stripHtml(title[1]);
        return fallback.replace(/(?:^|\/)index\.html$/i, '').replace(/\.html$/i, '').replace(/[-/]/g, ' ') || 'RICA Documentation';
    }

    private extractSearchText(html: string): string {
        const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
        return this.stripHtml(main ? main[1] : html);
    }

    private stripHtml(value: string): string {
        return value
            .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    private getStaticEnhancementsStyle(): string {
        return `<style>
            .VPSidebarItem.collapsed > .items { display: block !important; }
            .VPSidebarItem.collapsed > .item .caret-icon { transform: rotate(90deg) !important; }
            .rica-doc-search-backdrop {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding: 72px 20px 20px;
                background: rgba(0, 0, 0, 0.28);
            }
            .rica-doc-search-backdrop.is-open { display: flex; }
            .rica-doc-search-dialog {
                width: min(760px, 100%);
                max-height: min(720px, calc(100vh - 110px));
                overflow: hidden;
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                background: var(--vp-c-bg);
                box-shadow: var(--vp-shadow-4);
            }
            .rica-doc-search-input {
                box-sizing: border-box;
                width: 100%;
                border: 0;
                border-bottom: 1px solid var(--vp-c-divider);
                padding: 16px 18px;
                background: var(--vp-c-bg);
                color: var(--vp-c-text-1);
                font: 16px/1.4 var(--vp-font-family-base);
                outline: none;
            }
            .rica-doc-search-results {
                max-height: calc(min(720px, calc(100vh - 110px)) - 57px);
                overflow: auto;
                padding: 8px;
            }
            .rica-doc-search-result {
                display: block;
                width: 100%;
                border: 0;
                border-radius: 6px;
                padding: 10px 12px;
                background: transparent;
                color: var(--vp-c-text-1);
                text-align: left;
                cursor: pointer;
            }
            .rica-doc-search-result:hover,
            .rica-doc-search-result:focus {
                background: var(--vp-c-default-soft);
                outline: none;
            }
            .rica-doc-search-title {
                display: block;
                font-weight: 600;
            }
            .rica-doc-search-route {
                display: block;
                margin-top: 2px;
                color: var(--vp-c-text-2);
                font-size: 12px;
            }
            .rica-doc-search-empty {
                padding: 24px 12px;
                color: var(--vp-c-text-2);
            }
        </style>`;
    }

    private getStaticEnhancementsScript(searchIndex: SearchEntry[]): string {
        const encodedIndex = this.escapeScriptJson(searchIndex);
        return `<script>
            (function () {
                const vscode = acquireVsCodeApi();
                const searchIndex = ${encodedIndex};
                const themeStorageKey = 'vitepress-theme-appearance';
                function preferredDarkMode() {
                    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                function currentThemeMode() {
                    return localStorage.getItem(themeStorageKey) || 'auto';
                }
                function applyTheme(mode) {
                    const useDark = mode === 'dark' || (mode === 'auto' && preferredDarkMode());
                    document.documentElement.classList.toggle('dark', useDark);
                    document.documentElement.classList.toggle('mac', /Mac|iPhone|iPod|iPad/i.test(navigator.platform));
                    document.querySelectorAll('.VPSwitchAppearance').forEach(function (button) {
                        button.setAttribute('aria-checked', String(useDark));
                        button.setAttribute('title', useDark ? 'Switch to light mode' : 'Switch to dark mode');
                    });
                }
                function toggleTheme() {
                    const nextMode = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
                    localStorage.setItem(themeStorageKey, nextMode);
                    applyTheme(nextMode);
                }
                function openRoute(route) {
                    vscode.postMessage({ command: 'openRoute', route: route });
                }
                applyTheme(currentThemeMode());
                if (window.matchMedia) {
                    const media = window.matchMedia('(prefers-color-scheme: dark)');
                    media.addEventListener && media.addEventListener('change', function () {
                        if (currentThemeMode() === 'auto') applyTheme('auto');
                    });
                }
                document.addEventListener('click', function (event) {
                    const themeButton = event.target.closest && event.target.closest('.VPSwitchAppearance');
                    if (themeButton) {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleTheme();
                        return;
                    }
                    const link = event.target.closest && event.target.closest('a[href]');
                    if (!link) return;
                    const href = link.getAttribute('href') || '';
                    if (!href || href.startsWith('#') || /^(?:https?:|mailto:|data:|javascript:)/i.test(href)) return;
                    event.preventDefault();
                    openRoute(href);
                }, true);

                const backdrop = document.createElement('div');
                backdrop.className = 'rica-doc-search-backdrop';
                backdrop.innerHTML = '<div class="rica-doc-search-dialog" role="dialog" aria-modal="true" aria-label="Search RICA documentation"><input class="rica-doc-search-input" type="search" placeholder="Search RICA docs" autocomplete="off"><div class="rica-doc-search-results"></div></div>';
                document.body.appendChild(backdrop);
                const input = backdrop.querySelector('.rica-doc-search-input');
                const results = backdrop.querySelector('.rica-doc-search-results');

                function closeSearch() {
                    backdrop.classList.remove('is-open');
                    input.value = '';
                    renderResults('');
                }
                function openSearch() {
                    backdrop.classList.add('is-open');
                    setTimeout(function () { input.focus(); }, 0);
                }
                function score(entry, query) {
                    const title = entry.title.toLowerCase();
                    const text = entry.text.toLowerCase();
                    if (title.includes(query)) return 100;
                    if (entry.route.toLowerCase().includes(query)) return 80;
                    if (text.includes(query)) return 40;
                    return 0;
                }
                function renderResults(query) {
                    const normalized = query.trim().toLowerCase();
                    if (!normalized) {
                        results.innerHTML = '<div class="rica-doc-search-empty">Type a rule code, concept, or keyword.</div>';
                        return;
                    }
                    const matches = searchIndex
                        .map(function (entry) { return { entry: entry, score: score(entry, normalized) }; })
                        .filter(function (result) { return result.score > 0; })
                        .sort(function (a, b) { return b.score - a.score || a.entry.title.localeCompare(b.entry.title); })
                        .slice(0, 12);
                    if (!matches.length) {
                        results.innerHTML = '<div class="rica-doc-search-empty">No matching RICA documentation page found.</div>';
                        return;
                    }
                    results.innerHTML = '';
                    matches.forEach(function (result) {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'rica-doc-search-result';
                        button.innerHTML = '<span class="rica-doc-search-title"></span><span class="rica-doc-search-route"></span>';
                        button.querySelector('.rica-doc-search-title').textContent = result.entry.title;
                        button.querySelector('.rica-doc-search-route').textContent = result.entry.route;
                        button.addEventListener('click', function () {
                            closeSearch();
                            openRoute(result.entry.route);
                        });
                        results.appendChild(button);
                    });
                }

                input.addEventListener('input', function () { renderResults(input.value); });
                backdrop.addEventListener('click', function (event) {
                    if (event.target === backdrop) closeSearch();
                });
                document.addEventListener('keydown', function (event) {
                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                        event.preventDefault();
                        openSearch();
                    }
                    if (event.key === 'Escape' && backdrop.classList.contains('is-open')) {
                        event.preventDefault();
                        closeSearch();
                    }
                });
                const searchButton = document.querySelector('#local-search button');
                if (searchButton) {
                    searchButton.addEventListener('click', function (event) {
                        event.preventDefault();
                        openSearch();
                    });
                }
                renderResults('');
            }());
        </script>`;
    }

    private escapeScriptJson(value: unknown): string {
        return JSON.stringify(value)
            .replace(/</g, '\\u003c')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
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
