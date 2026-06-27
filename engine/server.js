const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 8082;

app.use(cors());
app.use(express.json({ limit: '5000mb' }));

// ─── In-Memory Stores ───────────────────────────────────────────────────────

// Full project AST: { projectId, projectName, timestamp, files: { [filePath]: astNode } }
let projectAST = null;

// History of changes received
const changeHistory = [];

// Snapshots of full AST sent
const astSnapshots = [];

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    console.log('Health check received');
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        hasProject: !!projectAST,
        totalFiles: projectAST ? Object.keys(projectAST.files).length : 0,
        totalChanges: changeHistory.length
    });
});

// ─── Receive Full Project AST (Initial Load) ────────────────────────────────

app.post('/ast/full', (req, res) => {
    const { projectName, files, workspacePath } = req.body;

    if (!files || typeof files !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid "files" object' });
    }

    const fileCount = Object.keys(files).length;
    const snapshotId = uuidv4();

    projectAST = {
        projectId: snapshotId,
        projectName: projectName || 'Unknown Project',
        workspacePath: workspacePath || '',
        timestamp: Date.now(),
        receivedAt: new Date().toISOString(),
        files: files,
        fileCount: fileCount
    };

    astSnapshots.push({
        snapshotId,
        projectName: projectAST.projectName,
        timestamp: projectAST.timestamp,
        receivedAt: projectAST.receivedAt,
        fileCount
    });

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   📦 FULL PROJECT AST RECEIVED                    ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  Project:    ${projectAST.projectName}`);
    console.log(`║  Files:      ${fileCount}`);
    console.log(`║  Snapshot:   ${snapshotId.substring(0, 8)}...`);
    console.log(`║  Timestamp:  ${projectAST.receivedAt}`);
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Log all file paths
    Object.keys(files).forEach((filePath, index) => {
        const nodeCount = countNodes(files[filePath]);
        console.log(`  ${index + 1}. ${filePath} (${nodeCount} AST nodes)`);
    });
    console.log('');

    res.json({
        status: 'ok',
        snapshotId,
        filesReceived: fileCount,
        message: `Full AST received for ${fileCount} files`
    });
});

// ─── Receive File Change (Create / Edit / Delete) ───────────────────────────

app.post('/ast/change', (req, res) => {
    const { changeType, filePath, ast, oldFilePath, timestamp: clientTimestamp } = req.body;

    if (!changeType || !filePath) {
        return res.status(400).json({ error: 'Missing changeType or filePath' });
    }

    const changeId = uuidv4();
    const changeRecord = {
        changeId,
        changeType,
        filePath,
        oldFilePath: oldFilePath || null,
        timestamp: Date.now(),
        clientTimestamp: clientTimestamp || null,
        receivedAt: new Date().toISOString(),
        nodeCount: ast ? countNodes(ast) : 0
    };

    // Apply change to stored project AST
    if (projectAST) {
        switch (changeType) {
            case 'created':
            case 'changed':
                projectAST.files[filePath] = ast;
                projectAST.fileCount = Object.keys(projectAST.files).length;
                projectAST.timestamp = Date.now();
                break;
            case 'deleted':
                delete projectAST.files[filePath];
                projectAST.fileCount = Object.keys(projectAST.files).length;
                projectAST.timestamp = Date.now();
                break;
            case 'renamed':
                if (oldFilePath && projectAST.files[oldFilePath]) {
                    delete projectAST.files[oldFilePath];
                }
                if (ast) {
                    projectAST.files[filePath] = ast;
                }
                projectAST.fileCount = Object.keys(projectAST.files).length;
                projectAST.timestamp = Date.now();
                break;
        }
    }

    changeHistory.push(changeRecord);

    const emoji = {
        created: '🆕',
        changed: '✏️',
        deleted: '🗑️',
        renamed: '📝'
    }[changeType] || '❓';

    console.log(`${emoji} [${changeType.toUpperCase()}] ${filePath}`);
    if (changeType === 'renamed' && oldFilePath) {
        console.log(`   From: ${oldFilePath}`);
    }
    if (ast) {
        console.log(`   AST nodes: ${changeRecord.nodeCount}`);
    }
    console.log(`   Total files in project: ${projectAST ? projectAST.fileCount : 'N/A'}`);
    console.log('');

    res.json({
        status: 'ok',
        changeId,
        changeType,
        totalFiles: projectAST ? projectAST.fileCount : 0,
        message: `Change "${changeType}" applied for ${filePath}`
    });
});

// ─── Get Full Project AST ────────────────────────────────────────────────────

app.get('/ast/full', (req, res) => {
    if (!projectAST) {
        return res.status(404).json({ error: 'No project AST loaded yet' });
    }
    res.json(projectAST);
});

// ─── Get AST For a Specific File ─────────────────────────────────────────────

app.get('/ast/file', (req, res) => {
    const { path: filePath } = req.query;

    if (!projectAST) {
        return res.status(404).json({ error: 'No project AST loaded yet' });
    }

    if (!filePath) {
        return res.status(400).json({ error: 'Missing "path" query parameter' });
    }

    // Try exact match first, then partial match
    let matchedPath = null;
    if (projectAST.files[filePath]) {
        matchedPath = filePath;
    } else {
        // Try to find by partial path match
        matchedPath = Object.keys(projectAST.files).find(p =>
            p.endsWith(filePath) || filePath.endsWith(p)
        );
    }

    if (!matchedPath) {
        return res.status(404).json({
            error: `File not found: ${filePath}`,
            availableFiles: Object.keys(projectAST.files)
        });
    }

    res.json({
        filePath: matchedPath,
        ast: projectAST.files[matchedPath],
        nodeCount: countNodes(projectAST.files[matchedPath])
    });
});

// ─── List All Files in Project ───────────────────────────────────────────────

app.get('/ast/files', (req, res) => {
    if (!projectAST) {
        return res.status(404).json({ error: 'No project AST loaded yet' });
    }

    const fileList = Object.keys(projectAST.files).map(filePath => ({
        filePath,
        nodeCount: countNodes(projectAST.files[filePath]),
        topLevelType: projectAST.files[filePath]?.type || 'unknown'
    }));

    res.json({
        projectName: projectAST.projectName,
        fileCount: fileList.length,
        files: fileList
    });
});

// ─── Get Change History ──────────────────────────────────────────────────────

app.get('/ast/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const slice = changeHistory.slice().reverse().slice(offset, offset + limit);

    res.json({
        total: changeHistory.length,
        limit,
        offset,
        changes: slice
    });
});

// ─── Get AST Snapshots ───────────────────────────────────────────────────────

app.get('/ast/snapshots', (req, res) => {
    res.json({
        total: astSnapshots.length,
        snapshots: astSnapshots.slice().reverse()
    });
});

// ─── Search AST Nodes ───────────────────────────────────────────────────────

app.get('/ast/search', (req, res) => {
    const { type, name } = req.query;

    if (!projectAST) {
        return res.status(404).json({ error: 'No project AST loaded yet' });
    }

    if (!type && !name) {
        return res.status(400).json({ error: 'Provide "type" and/or "name" query parameters' });
    }

    const results = [];

    Object.entries(projectAST.files).forEach(([filePath, ast]) => {
        searchNodes(ast, type, name, filePath, [], results);
    });

    res.json({
        query: { type, name },
        resultCount: results.length,
        results: results.slice(0, 200) // Limit results
    });
});

// ─── AST Statistics ──────────────────────────────────────────────────────────

app.get('/ast/stats', (req, res) => {
    if (!projectAST) {
        return res.status(404).json({ error: 'No project AST loaded yet' });
    }

    const stats = {
        projectName: projectAST.projectName,
        fileCount: projectAST.fileCount,
        totalChanges: changeHistory.length,
        lastUpdated: new Date(projectAST.timestamp).toISOString(),
        nodeTypes: {},
        totalNodes: 0,
        classCount: 0,
        methodCount: 0,
        fieldCount: 0,
        importCount: 0
    };

    Object.values(projectAST.files).forEach(ast => {
        collectStats(ast, stats);
    });

    res.json(stats);
});

// ─── View AST in Browser (HTML) ─────────────────────────────────────────────

app.get('/view', (req, res) => {
    res.send(getViewerHTML());
});

app.get('/view/file', (req, res) => {
    const { path: filePath } = req.query;
    res.send(getFileViewerHTML(filePath));
});

// ─── Clear / Reset ──────────────────────────────────────────────────────────

app.post('/ast/reset', (req, res) => {
    projectAST = null;
    changeHistory.length = 0;
    astSnapshots.length = 0;
    console.log('🔄 AST data reset');
    res.json({ status: 'ok', message: 'All data cleared' });
});

// ─── Helper Functions ────────────────────────────────────────────────────────

function countNodes(node) {
    if (!node || typeof node !== 'object') return 0;
    let count = 1;
    if (Array.isArray(node)) {
        node.forEach(child => { count += countNodes(child); });
    } else {
        Object.values(node).forEach(value => {
            if (typeof value === 'object' && value !== null) {
                count += countNodes(value);
            }
        });
    }
    return count;
}

function searchNodes(node, type, name, filePath, path, results) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
        node.forEach((child, i) => searchNodes(child, type, name, filePath, [...path, i], results));
        return;
    }

    let matches = true;
    if (type && node.type !== type) matches = false;
    if (name && node.name !== name) matches = false;

    if (matches && (type || name)) {
        results.push({
            filePath,
            path: path.join('.'),
            node: {
                type: node.type,
                name: node.name,
                location: node.location
            }
        });
    }

    Object.entries(node).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            searchNodes(value, type, name, filePath, [...path, key], results);
        }
    });
}

function collectStats(node, stats) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
        node.forEach(child => collectStats(child, stats));
        return;
    }

    if (node.type) {
        stats.totalNodes++;
        stats.nodeTypes[node.type] = (stats.nodeTypes[node.type] || 0) + 1;

        if (node.type === 'ClassDeclaration' || node.type === 'InterfaceDeclaration' ||
            node.type === 'EnumDeclaration' || node.type === 'TypeDeclaration') {
            stats.classCount++;
        }
        if (node.type === 'MethodDeclaration' || node.type === 'ConstructorDeclaration') {
            stats.methodCount++;
        }
        if (node.type === 'FieldDeclaration') {
            stats.fieldCount++;
        }
        if (node.type === 'ImportDeclaration') {
            stats.importCount++;
        }
    }

    Object.values(node).forEach(value => {
        if (typeof value === 'object' && value !== null) {
            collectStats(value, stats);
        }
    });
}

// ─── Viewer HTML ─────────────────────────────────────────────────────────────

function getViewerHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Java AST Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            display: flex;
            height: 100vh;
        }
        .sidebar {
            width: 320px;
            background: #161b22;
            border-right: 1px solid #30363d;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .sidebar-header {
            padding: 16px;
            background: #21262d;
            border-bottom: 1px solid #30363d;
        }
        .sidebar-header h2 {
            color: #58a6ff;
            font-size: 16px;
            margin-bottom: 8px;
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            font-size: 12px;
        }
        .stat-item {
            background: #0d1117;
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid #30363d;
        }
        .stat-value { color: #58a6ff; font-weight: bold; font-size: 16px; }
        .stat-label { color: #8b949e; font-size: 11px; }
        .search-box {
            padding: 10px 16px;
            border-bottom: 1px solid #30363d;
        }
        .search-box input {
            width: 100%;
            padding: 8px 12px;
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            color: #c9d1d9;
            font-size: 13px;
            outline: none;
        }
        .search-box input:focus { border-color: #58a6ff; }
        .file-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        .file-item {
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            margin-bottom: 2px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background 0.15s;
        }
        .file-item:hover { background: #21262d; }
        .file-item.active { background: #1f6feb33; border: 1px solid #1f6feb; }
        .file-icon { font-size: 16px; }
        .file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .file-nodes { color: #8b949e; font-size: 11px; }
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .toolbar {
            padding: 10px 16px;
            background: #161b22;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .toolbar button {
            padding: 6px 14px;
            background: #21262d;
            border: 1px solid #30363d;
            border-radius: 6px;
            color: #c9d1d9;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.15s;
        }
        .toolbar button:hover { background: #30363d; border-color: #58a6ff; }
        .toolbar button.active { background: #1f6feb; border-color: #1f6feb; color: white; }
        .breadcrumb {
            color: #8b949e;
            font-size: 13px;
            flex: 1;
        }
        .breadcrumb span { color: #58a6ff; }
        .ast-container {
            flex: 1;
            overflow: auto;
            padding: 16px;
        }
        .ast-tree { font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px; }
        .ast-node {
            margin-left: 20px;
            border-left: 1px solid #30363d;
            padding-left: 12px;
            margin-bottom: 2px;
        }
        .ast-node-header {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.15s;
        }
        .ast-node-header:hover { background: #21262d; }
        .toggle-btn {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #8b949e;
            cursor: pointer;
            user-select: none;
        }
        .node-type {
            color: #ff7b72;
            font-weight: 600;
        }
        .node-name {
            color: #d2a8ff;
        }
        .node-value {
            color: #a5d6ff;
        }
        .node-primitive {
            color: #79c0ff;
        }
        .node-location {
            color: #8b949e;
            font-size: 11px;
        }
        .collapsed > .ast-node-children { display: none; }
        .collapsed .toggle-btn::before { content: '▶'; }
        .expanded .toggle-btn::before { content: '▼'; }
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #8b949e;
        }
        .empty-state .icon { font-size: 64px; margin-bottom: 16px; }
        .empty-state h3 { margin-bottom: 8px; color: #c9d1d9; }
        .history-panel {
            width: 300px;
            background: #161b22;
            border-left: 1px solid #30363d;
            display: none;
            flex-direction: column;
        }
        .history-panel.visible { display: flex; }
        .history-panel h3 {
            padding: 12px 16px;
            border-bottom: 1px solid #30363d;
            color: #58a6ff;
            font-size: 14px;
        }
        .history-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        .history-item {
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 4px;
            background: #0d1117;
            border: 1px solid #30363d;
            font-size: 12px;
        }
        .history-type { font-weight: bold; text-transform: uppercase; }
        .history-type.created { color: #3fb950; }
        .history-type.changed { color: #d29922; }
        .history-type.deleted { color: #f85149; }
        .history-time { color: #8b949e; font-size: 11px; }
        .json-view { white-space: pre-wrap; font-family: monospace; font-size: 13px; padding: 16px; }
        .refresh-indicator {
            display: none;
            padding: 4px 12px;
            background: #1f6feb;
            color: white;
            font-size: 11px;
            border-radius: 12px;
        }
        .refresh-indicator.active { display: inline-block; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h2>☕ Java AST Viewer</h2>
            <div id="projectName" style="color:#8b949e;font-size:12px;margin-bottom:8px;">Loading...</div>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value" id="fileCount">-</div>
                    <div class="stat-label">Files</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="nodeCount">-</div>
                    <div class="stat-label">Nodes</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="classCount">-</div>
                    <div class="stat-label">Classes</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="changeCount">-</div>
                    <div class="stat-label">Changes</div>
                </div>
            </div>
        </div>
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search files..." />
        </div>
        <div class="file-list" id="fileList"></div>
    </div>

    <div class="main-content">
        <div class="toolbar">
            <div class="breadcrumb" id="breadcrumb">Select a file to view its AST</div>
            <span class="refresh-indicator" id="refreshIndicator">⟳ Refreshing...</span>
            <button id="btnTree" class="active" onclick="setView('tree')">🌳 Tree</button>
            <button id="btnJson" onclick="setView('json')">{ } JSON</button>
            <button id="btnHistory" onclick="toggleHistory()">📋 History</button>
            <button onclick="refreshData()">🔄 Refresh</button>
            <button onclick="expandAll()">+ Expand All</button>
            <button onclick="collapseAll()">- Collapse All</button>
        </div>
        <div class="ast-container" id="astContainer">
            <div class="empty-state">
                <div class="icon">🌲</div>
                <h3>No file selected</h3>
                <p>Select a Java file from the sidebar to view its AST</p>
            </div>
        </div>
    </div>

    <div class="history-panel" id="historyPanel">
        <h3>📋 Change History</h3>
        <div class="history-list" id="historyList"></div>
    </div>

    <script>
        const API = 'http://localhost:${PORT}';
        let currentView = 'tree';
        let currentFile = null;
        let allFiles = [];
        let autoRefreshInterval = null;

        async function fetchStats() {
            try {
                const res = await fetch(API + '/ast/stats');
                if (!res.ok) return;
                const data = await res.json();
                document.getElementById('projectName').textContent = data.projectName || 'Unknown';
                document.getElementById('fileCount').textContent = data.fileCount || 0;
                document.getElementById('nodeCount').textContent = data.totalNodes || 0;
                document.getElementById('classCount').textContent = data.classCount || 0;
                document.getElementById('changeCount').textContent = data.totalChanges || 0;
            } catch (e) {
                document.getElementById('projectName').textContent = 'Not connected';
            }
        }

        async function fetchFiles() {
            try {
                const res = await fetch(API + '/ast/files');
                if (!res.ok) return;
                const data = await res.json();
                allFiles = data.files || [];
                renderFileList(allFiles);
            } catch (e) {
                console.error('Failed to fetch files:', e);
            }
        }

        function renderFileList(files) {
            const container = document.getElementById('fileList');
            container.innerHTML = '';
            files.forEach(f => {
                const shortName = f.filePath.split(/[\\/\\\\]/).pop();
                const div = document.createElement('div');
                div.className = 'file-item' + (currentFile === f.filePath ? ' active' : '');
                div.innerHTML = \`
                    <span class="file-icon">☕</span>
                    <span class="file-name" title="\${f.filePath}">\${shortName}</span>
                    <span class="file-nodes">\${f.nodeCount}n</span>
                \`;
                div.onclick = () => selectFile(f.filePath);
                container.appendChild(div);
            });
        }

        async function selectFile(filePath) {
            currentFile = filePath;
            renderFileList(allFiles);

            const shortName = filePath.split(/[\\/\\\\]/).pop();
            document.getElementById('breadcrumb').innerHTML = \`<span>\${shortName}</span> — \${filePath}\`;

            try {
                const res = await fetch(API + '/ast/file?path=' + encodeURIComponent(filePath));
                if (!res.ok) throw new Error('Not found');
                const data = await res.json();
                renderAST(data.ast);
            } catch (e) {
                document.getElementById('astContainer').innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Failed to load AST</h3></div>';
            }
        }

        function renderAST(ast) {
            const container = document.getElementById('astContainer');
            if (currentView === 'json') {
                container.innerHTML = '<pre class="json-view">' + syntaxHighlightJSON(JSON.stringify(ast, null, 2)) + '</pre>';
            } else {
                container.innerHTML = '<div class="ast-tree">' + renderNode(ast, 0) + '</div>';
            }
        }

        function renderNode(node, depth) {
            if (node === null || node === undefined) return '<span class="node-primitive">null</span>';
            if (typeof node !== 'object') return '<span class="node-primitive">' + escapeHtml(String(node)) + '</span>';

            if (Array.isArray(node)) {
                if (node.length === 0) return '<span class="node-primitive">[]</span>';
                const id = 'n' + Math.random().toString(36).substr(2, 9);
                let html = '<div class="ast-node expanded" id="' + id + '">';
                html += '<div class="ast-node-header" onclick="toggleNode(\\'' + id + '\\')">';
                html += '<span class="toggle-btn"></span>';
                html += '<span class="node-type">Array[' + node.length + ']</span>';
                html += '</div>';
                html += '<div class="ast-node-children">';
                node.forEach((item, i) => {
                    html += '<div style="margin-left:20px;border-left:1px solid #30363d;padding-left:12px;">';
                    html += '<span style="color:#8b949e;">[' + i + ']</span> ';
                    html += renderNode(item, depth + 1);
                    html += '</div>';
                });
                html += '</div></div>';
                return html;
            }

            const keys = Object.keys(node);
            if (keys.length === 0) return '<span class="node-primitive">{}</span>';

            const id = 'n' + Math.random().toString(36).substr(2, 9);
            const nodeType = node.type || '';
            const nodeName = node.name || '';
            const loc = node.location ? \`[\${node.location.startLine || '?'}:\${node.location.startColumn || '?'}]\` : '';
            const defaultState = depth < 2 ? 'expanded' : 'collapsed';

            let html = '<div class="ast-node ' + defaultState + '" id="' + id + '">';
            html += '<div class="ast-node-header" onclick="toggleNode(\\'' + id + '\\')">';
            html += '<span class="toggle-btn"></span>';
            if (nodeType) html += '<span class="node-type">' + escapeHtml(nodeType) + '</span>';
            if (nodeName) html += ' <span class="node-name">' + escapeHtml(nodeName) + '</span>';
            if (loc) html += ' <span class="node-location">' + loc + '</span>';
            html += '</div>';
            html += '<div class="ast-node-children">';

            keys.forEach(key => {
                if (key === 'type' && nodeType) return;
                if (key === 'name' && nodeName && nodeType) return;

                const value = node[key];
                html += '<div style="margin-left:20px;border-left:1px solid #30363d;padding-left:12px;padding-top:2px;">';
                html += '<span style="color:#7ee787;">' + escapeHtml(key) + '</span>: ';
                if (typeof value === 'object' && value !== null) {
                    html += renderNode(value, depth + 1);
                } else {
                    html += '<span class="node-primitive">' + escapeHtml(JSON.stringify(value)) + '</span>';
                }
                html += '</div>';
            });

            html += '</div></div>';
            return html;
        }

        function toggleNode(id) {
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

        function setView(view) {
            currentView = view;
            document.getElementById('btnTree').classList.toggle('active', view === 'tree');
            document.getElementById('btnJson').classList.toggle('active', view === 'json');
            if (currentFile) selectFile(currentFile);
        }

        function toggleHistory() {
            const panel = document.getElementById('historyPanel');
            panel.classList.toggle('visible');
            if (panel.classList.contains('visible')) fetchHistory();
        }

        async function fetchHistory() {
            try {
                const res = await fetch(API + '/ast/history?limit=50');
                if (!res.ok) return;
                const data = await res.json();
                const list = document.getElementById('historyList');
                list.innerHTML = '';
                data.changes.forEach(ch => {
                    const div = document.createElement('div');
                    div.className = 'history-item';
                    const shortName = ch.filePath.split(/[\\/\\\\]/).pop();
                    div.innerHTML = \`
                        <div class="history-type \${ch.changeType}">\${ch.changeType}</div>
                        <div>\${shortName}</div>
                        <div class="history-time">\${ch.receivedAt}</div>
                    \`;
                    div.onclick = () => selectFile(ch.filePath);
                    list.appendChild(div);
                });
            } catch (e) {
                console.error('Failed to fetch history:', e);
            }
        }

        async function refreshData() {
            const indicator = document.getElementById('refreshIndicator');
            indicator.classList.add('active');
            await fetchStats();
            await fetchFiles();
            if (currentFile) await selectFile(currentFile);
            setTimeout(() => indicator.classList.remove('active'), 500);
        }

        function syntaxHighlightJSON(json) {
            return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
                let cls = 'node-primitive';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) { cls = 'node-type'; match = match.replace(/:$/, ':'); }
                    else { cls = 'node-value'; }
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        document.getElementById('searchInput').addEventListener('input', function() {
            const q = this.value.toLowerCase();
            const filtered = allFiles.filter(f => f.filePath.toLowerCase().includes(q));
            renderFileList(filtered);
        });

        // Auto-refresh every 5 seconds
        autoRefreshInterval = setInterval(() => {
            fetchStats();
            fetchFiles();
            const panel = document.getElementById('historyPanel');
            if (panel.classList.contains('visible')) fetchHistory();
        }, 5000);

        // Initial load
        refreshData();
    </script>
</body>
</html>`;
}

function getFileViewerHTML(filePath) {
    return `<!DOCTYPE html>
    <html><head><title>AST - ${filePath || 'File'}</title>
    <style>body{background:#0d1117;color:#c9d1d9;font-family:monospace;padding:20px;}</style>
    </head><body>
    <h2>AST for: ${filePath || 'Unknown'}</h2>
    <pre id="ast">Loading...</pre>
    <script>
    fetch('http://localhost:${PORT}/ast/file?path=${encodeURIComponent(filePath || '')}')
    .then(r=>r.json()).then(d=>{document.getElementById('ast').textContent=JSON.stringify(d.ast,null,2);})
    .catch(e=>{document.getElementById('ast').textContent='Error: '+e.message;});
    </script></body></html>`;
}

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   ☕ Java AST Analyzer Backend Server             ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\n🚀 Server is listening on http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('  GET  /health         - Health check');
    console.log('  POST /ast/full       - Receive full project AST');
    console.log('  POST /ast/change     - Receive file change');
    console.log('  GET  /ast/full       - Get full project AST');
    console.log('  GET  /ast/file?path= - Get single file AST');
    console.log('  GET  /ast/files      - List all files');
    console.log('  GET  /ast/history    - Get change history');
    console.log('  GET  /ast/stats      - Get AST statistics');
    console.log('  GET  /ast/search     - Search AST nodes');
    console.log('  GET  /ast/snapshots  - List AST snapshots');
    console.log('  GET  /view           - Browser AST viewer');
    console.log('  POST /ast/reset      - Clear all data');
    console.log(`\n🌐 Open AST Viewer: http://localhost:${PORT}/view`);
    console.log('\n💡 Waiting for VS Code extension to connect...\n');
});
