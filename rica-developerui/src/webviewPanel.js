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
exports.ASTWebviewPanel = void 0;
const vscode = __importStar(require("vscode"));
class ASTWebviewPanel {
    static createOrShow(extensionUri, apiClient) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (ASTWebviewPanel.currentPanel) {
            ASTWebviewPanel.currentPanel._panel.reveal(column);
            ASTWebviewPanel.currentPanel.refresh();
            return;
        }
        const panel = vscode.window.createWebviewPanel('javaAstViewer', 'Java AST Viewer', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        ASTWebviewPanel.currentPanel = new ASTWebviewPanel(panel, apiClient);
    }
    constructor(panel, apiClient) {
        this._disposables = [];
        this._panel = panel;
        this._apiClient = apiClient;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'getFiles':
                    const files = await this._apiClient.getFiles();
                    this._panel.webview.postMessage({ command: 'files', data: files });
                    break;
                case 'getFileAST':
                    const ast = await this._apiClient.getFileAST(message.filePath);
                    this._panel.webview.postMessage({ command: 'fileAST', data: ast });
                    break;
                case 'getStats':
                    const stats = await this._apiClient.getStats();
                    this._panel.webview.postMessage({ command: 'stats', data: stats });
                    break;
                case 'getHistory':
                    const history = await this._apiClient.getHistory();
                    this._panel.webview.postMessage({ command: 'history', data: history });
                    break;
            }
        }, null, this._disposables);
    }
    async refresh() {
        this._update();
    }
    dispose() {
        ASTWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x)
                x.dispose();
        }
    }
    _update() {
        this._panel.title = 'Java AST Viewer';
        this._panel.webview.html = this._getHtmlContent();
    }
    _getHtmlContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Java AST Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            height: 100vh;
            overflow: hidden;
        }
        .sidebar {
            width: 280px;
            border-right: 1px solid var(--vscode-panel-border);
            display: flex;
            flex-direction: column;
        }
        .sidebar-header {
            padding: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        .sidebar-header h3 {
            color: var(--vscode-sideBarTitle-foreground);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stats-row {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            font-size: 11px;
        }
        .stat-badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
        }
        .file-list {
            flex: 1;
            overflow-y: auto;
            padding: 4px;
        }
        .file-item {
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .file-item:hover { background: var(--vscode-list-hoverBackground); }
        .file-item.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
        .main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .toolbar {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .toolbar button {
            padding: 4px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground); }
        .toolbar button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .content {
            flex: 1;
            overflow: auto;
            padding: 12px;
            font-family: var(--vscode-editor-fontFamily);
            font-size: var(--vscode-editor-fontSize, 13px);
        }
        .ast-node {
            margin-left: 16px;
            border-left: 1px solid var(--vscode-panel-border);
            padding-left: 8px;
        }
        .ast-header {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 2px 4px;
            border-radius: 3px;
            cursor: pointer;
        }
        .ast-header:hover { background: var(--vscode-list-hoverBackground); }
        .toggle { width: 14px; font-size: 10px; color: var(--vscode-descriptionForeground); user-select: none; }
        .node-type { color: var(--vscode-symbolIcon-classForeground, #ee9d28); font-weight: bold; }
        .node-name { color: var(--vscode-symbolIcon-methodForeground, #b180d7); }
        .node-val { color: var(--vscode-symbolIcon-stringForeground, #ce9178); }
        .node-key { color: var(--vscode-symbolIcon-fieldForeground, #75beff); }
        .collapsed > .ast-children { display: none; }
        .collapsed .toggle::after { content: '▶'; }
        .expanded .toggle::after { content: '▼'; }
        .empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--vscode-descriptionForeground);
            flex-direction: column;
            gap: 8px;
        }
        .empty .icon { font-size: 48px; }
        .search-input {
            width: 100%;
            padding: 6px 8px;
            margin-top: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 12px;
            outline: none;
        }
        .search-input:focus { border-color: var(--vscode-focusBorder); }
        .breadcrumb {
            flex: 1;
            font-size: 12px;
            color: var(--vscode-breadcrumb-foreground);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h3>☕ Java AST</h3>
            <div class="stats-row">
                <span class="stat-badge" id="fileCount">0 files</span>
                <span class="stat-badge" id="nodeCount">0 nodes</span>
            </div>
            <input type="text" class="search-input" id="search" placeholder="Filter files..." />
        </div>
        <div class="file-list" id="fileList">
            <div class="empty"><span>Loading...</span></div>
        </div>
    </div>
    <div class="main">
        <div class="toolbar">
            <span class="breadcrumb" id="breadcrumb">Select a file</span>
            <button onclick="refresh()">↻ Refresh</button>
            <button onclick="expandAll()">+ All</button>
            <button onclick="collapseAll()">- All</button>
            <button id="viewToggle" onclick="toggleView()">{ } JSON</button>
        </div>
        <div class="content" id="content">
            <div class="empty">
                <span class="icon">🌲</span>
                <span>Select a Java file to view its AST</span>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let files = [];
        let currentFile = null;
        let currentAST = null;
        let viewMode = 'tree';

        function refresh() {
            vscode.postMessage({ command: 'getFiles' });
            vscode.postMessage({ command: 'getStats' });
        }

        function selectFile(filePath) {
            currentFile = filePath;
            renderFileList();
            document.getElementById('breadcrumb').textContent = filePath;
            vscode.postMessage({ command: 'getFileAST', filePath });
        }

        function renderFileList() {
            const search = document.getElementById('search').value.toLowerCase();
            const container = document.getElementById('fileList');
            const filtered = files.filter(f => f.filePath.toLowerCase().includes(search));

            container.innerHTML = filtered.map(f => {
                const name = f.filePath.split(/[\\/\\\\]/).pop();
                const active = f.filePath === currentFile ? 'active' : '';
                return '<div class="file-item ' + active + '" onclick="selectFile(\\'' +
                    f.filePath.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'") +
                    '\\')">' +
                    '<span>☕ ' + name + '</span>' +
                    '<span style="font-size:11px;opacity:0.6">' + (f.nodeCount || '') + '</span></div>';
            }).join('');
        }

        function renderAST(ast) {
            currentAST = ast;
            const container = document.getElementById('content');
            if (viewMode === 'json') {
                container.innerHTML = '<pre style="white-space:pre-wrap;word-break:break-all;">' +
                    escapeHtml(JSON.stringify(ast, null, 2)) + '</pre>';
            } else {
                container.innerHTML = buildTreeHTML(ast, 0);
            }
        }

        function buildTreeHTML(node, depth) {
            if (node === null || node === undefined) return '<span class="node-val">null</span>';
            if (typeof node !== 'object') return '<span class="node-val">' + escapeHtml(String(node)) + '</span>';

            if (Array.isArray(node)) {
                if (node.length === 0) return '<span class="node-val">[]</span>';
                const id = 'n' + Math.random().toString(36).substr(2,8);
                const state = depth < 2 ? 'expanded' : 'collapsed';
                let h = '<div class="ast-node ' + state + '" id="' + id + '">';
                h += '<div class="ast-header" onclick="tog(\\'' + id + '\\')">';
                h += '<span class="toggle"></span><span class="node-type">Array[' + node.length + ']</span></div>';
                h += '<div class="ast-children">';
                node.forEach((item, i) => {
                    h += '<div style="margin-left:16px;padding-left:8px;border-left:1px solid var(--vscode-panel-border);">';
                    h += '<span class="node-key">[' + i + ']</span>: ' + buildTreeHTML(item, depth+1) + '</div>';
                });
                h += '</div></div>';
                return h;
            }

            const keys = Object.keys(node);
            if (keys.length === 0) return '<span class="node-val">{}</span>';

            const id = 'n' + Math.random().toString(36).substr(2,8);
            const state = depth < 2 ? 'expanded' : 'collapsed';
            const type = node.type || '';
            const name = node.name || '';

            let h = '<div class="ast-node ' + state + '" id="' + id + '">';
            h += '<div class="ast-header" onclick="tog(\\'' + id + '\\')">';
            h += '<span class="toggle"></span>';
            if (type) h += '<span class="node-type">' + escapeHtml(type) + '</span> ';
            if (name) h += '<span class="node-name">' + escapeHtml(name) + '</span>';
            h += '</div><div class="ast-children">';

            keys.forEach(key => {
                if (key === 'type' && type) return;
                if (key === 'name' && name && type) return;
                const val = node[key];
                h += '<div style="margin-left:16px;padding-left:8px;border-left:1px solid var(--vscode-panel-border);">';
                h += '<span class="node-key">' + escapeHtml(key) + '</span>: ';
                if (typeof val === 'object' && val !== null) {
                    h += buildTreeHTML(val, depth+1);
                } else {
                    h += '<span class="node-val">' + escapeHtml(JSON.stringify(val)) + '</span>';
                }
                h += '</div>';
            });

            h += '</div></div>';
            return h;
        }

        function tog(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('expanded');
            el.classList.toggle('collapsed');
        }

        function expandAll() {
            document.querySelectorAll('.ast-node.collapsed').forEach(el => {
                el.classList.remove('collapsed');
                el.classList.add('expanded');
            });
        }

        function collapseAll() {
            document.querySelectorAll('.ast-node.expanded').forEach(el => {
                el.classList.remove('expanded');
                el.classList.add('collapsed');
            });
        }

        function toggleView() {
            viewMode = viewMode === 'tree' ? 'json' : 'tree';
            document.getElementById('viewToggle').textContent = viewMode === 'tree' ? '{ } JSON' : '🌳 Tree';
            if (currentAST) renderAST(currentAST);
        }

        function escapeHtml(text) {
            const d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.command) {
                case 'files':
                    if (msg.data?.files) {
                        files = msg.data.files;
                        document.getElementById('fileCount').textContent = files.length + ' files';
                        renderFileList();
                    }
                    break;
                case 'fileAST':
                    if (msg.data?.ast) {
                        renderAST(msg.data.ast);
                    }
                    break;
                case 'stats':
                    if (msg.data) {
                        document.getElementById('nodeCount').textContent = (msg.data.totalNodes || 0) + ' nodes';
                    }
                    break;
            }
        });

        document.getElementById('search').addEventListener('input', renderFileList);

        // Auto-refresh periodically
        setInterval(refresh, 10000);

        // Initial load
        refresh();
    </script>
</body>
</html>`;
    }
}
exports.ASTWebviewPanel = ASTWebviewPanel;
//# sourceMappingURL=webviewPanel.js.map