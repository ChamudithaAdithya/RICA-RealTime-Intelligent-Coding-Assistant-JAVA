import * as vscode from 'vscode';
import { Violation } from './types/violations';
import { ViolationManager } from './violationManager';

export class ViolationsWebviewPanel {
    public static currentPanel: ViolationsWebviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _violationManager: ViolationManager;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, violationManager: ViolationManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ViolationsWebviewPanel.currentPanel) {
            ViolationsWebviewPanel.currentPanel._panel.reveal(column);
            ViolationsWebviewPanel.currentPanel.refresh();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'javaViolationsViewer',
            'Java Architecture Violations',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ViolationsWebviewPanel.currentPanel = new ViolationsWebviewPanel(panel, violationManager);
    }

    private constructor(panel: vscode.WebviewPanel, violationManager: ViolationManager) {
        this._panel = panel;
        this._violationManager = violationManager;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'openFile':
                        if (message.filePath) {
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            if (workspaceFolders && workspaceFolders.length > 0) {
                                const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, message.filePath);
                                const doc = await vscode.workspace.openTextDocument(uri);
                                const editor = await vscode.window.showTextDocument(doc);
                                const line = Math.max(0, (message.lineNumber || 1) - 1);
                                editor.selection = new vscode.Selection(line, 0, line, 0);
                                editor.revealRange(new vscode.Range(line, 0, line, 0));
                            }
                        }
                        break;
                    case 'ignoreViolation':
                        if (message.id) {
                            violationManager.ignoreViolation(message.id);
                            this._update();
                        }
                        break;
                    case 'unignoreViolation':
                        if (message.id) {
                            violationManager.unignoreViolation(message.id);
                            this._update();
                        }
                        break;
                }
            },
            null,
            this._disposables
        );

        this._update();
    }

    public async refresh() {
        this._update();
    }

    public dispose() {
        ViolationsWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        this._panel.title = 'Java Architecture Violations';
        const violations = this._violationManager.getActiveViolations();
        const ignoredIds = this._violationManager.getIgnoredIds();
        this._panel.webview.html = this._getHtmlContent(violations, ignoredIds);
    }

    private _getHtmlContent(violations: Violation[], ignoredIds: string[]): string {
        const dataJson = JSON.stringify(violations).replace(/<\/script>/gi, '<\\/script>');
        const ignoredJson = JSON.stringify(ignoredIds).replace(/<\/script>/gi, '<\\/script>');
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Violations</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--vscode-font-family);background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);overflow:hidden;height:100vh;display:flex;flex-direction:column}
.toolbar{padding:8px 16px;border-bottom:1px solid var(--vscode-panel-border);display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--vscode-sideBar-background)}
.toolbar .title{font-size:14px;font-weight:600;margin-right:auto}
.toolbar .count{font-size:11px;opacity:.7;margin-right:16px}
.toolbar select,.toolbar input{padding:4px 8px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;font-size:12px;outline:none}
.toolbar select:focus,.toolbar input:focus{border-color:var(--vscode-focusBorder)}
.toolbar button{padding:4px 12px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;cursor:pointer;font-size:12px}
.toolbar button:hover{background:var(--vscode-button-hoverBackground)}
.toolbar button.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{position:sticky;top:0;z-index:1}
th{padding:8px 12px;text-align:left;border-bottom:2px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background);font-weight:600;white-space:nowrap;cursor:pointer;user-select:none}
th:hover{background:var(--vscode-list-hoverBackground)}
th .sort{font-size:10px;margin-left:4px;opacity:.5}
td{padding:6px 12px;border-bottom:1px solid var(--vscode-panel-border);vertical-align:top}
tr:hover{background:var(--vscode-list-hoverBackground)}
tr.clickable{cursor:pointer}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase}
.badge-error{background:#f48771;color:#fff}
.badge-warning{background:#cca700;color:#000}
.badge-info{background:#75beff;color:#000}
.badge-source{background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);font-size:10px;padding:1px 6px;border-radius:4px;margin-right:4px}
.message-cell{max-width:400px;overflow:hidden;text-overflow:ellipsis}
.file-cell{max-width:250px;overflow:hidden;text-overflow:ellipsis;font-family:var(--vscode-editor-font-family);font-size:11px}
.hint-cell{max-width:300px;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:var(--vscode-descriptionForeground)}
#notificationBar{display:none;padding:8px 16px;font-size:12px;border-bottom:1px solid var(--vscode-panel-border);align-items:center;gap:8px}
#notificationBar.info{background:var(--vscode-editorInfo-background,#062);color:var(--vscode-editorInfo-foreground)}
#notificationBar .msg{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#notificationBar .closeBtn{cursor:pointer;font-size:14px;opacity:.7;background:none;border:none;color:inherit;padding:0 4px}
.file-link{cursor:pointer;text-decoration:underline;color:var(--vscode-textLink-foreground)}
.file-link:hover{color:var(--vscode-textLink-activeForeground)}
.empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--vscode-descriptionForeground);flex-direction:column;gap:8px;font-size:14px}
.empty .icon{font-size:48px}
#tableContainer{flex:1;overflow:auto}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--vscode-scrollbarSlider-background);border-radius:4px}
/* Ignored badge bar */
#ignoredBar{display:none;padding:4px 12px;border-top:1px solid var(--vscode-panel-border);background:var(--vscode-sideBar-background);font-size:11px;align-items:center;gap:6px;flex-shrink:0;cursor:pointer;user-select:none}
#ignoredBar:hover{background:var(--vscode-list-hoverBackground)}
#ignoredBar .label{opacity:.7;margin-right:4px}
.ignored-dot{display:inline-flex;align-items:center;gap:3px;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:600;cursor:pointer}
.ignored-dot:hover{filter:brightness(1.2)}
.ignored-dot.error{background:#f48771;color:#fff}
.ignored-dot.warning{background:#cca700;color:#000}
.ignored-dot.info{background:#75beff;color:#000}
.action-btn{padding:2px 10px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid transparent;white-space:nowrap}
.action-btn.ignore{border-color:var(--vscode-errorForeground);color:var(--vscode-errorForeground);background:transparent}
.action-btn.ignore:hover{background:var(--vscode-errorForeground);color:#fff}
.action-btn.unignore{border-color:var(--vscode-textLink-foreground);color:var(--vscode-textLink-foreground);background:transparent}
.action-btn.unignore:hover{background:var(--vscode-textLink-foreground);color:#fff}
</style>
</head>
<body>
<div id="notificationBar" class="info"><span class="msg" id="notifMsg"></span><button class="closeBtn" onclick="hideNotif()">&times;</button></div>
<div class="toolbar">
<span class="title">Architecture Violations</span>
<span class="count" id="violationCount">0 violations</span>
<select id="sourceFilter"><option value="all">All sources</option><option value="ServiceLayer">ServiceLayer</option><option value="ControllerLayer">ControllerLayer</option><option value="EntityLayer">EntityLayer</option><option value="APIResourceLayer">APIResourceLayer</option><option value="CrossFileAnalyzer">CrossFileAnalyzer</option></select>
<select id="severityFilter"><option value="all">All severities</option><option value="error">Errors</option><option value="warning">Warnings</option><option value="info">Info</option></select>
<input type="text" id="searchInput" placeholder="Search violations..." style="width:180px">
<label style="font-size:12px;cursor:pointer"><input type="checkbox" id="showIgnored"> Show ignored</label>
<span id="ignoredBadgeArea" style="display:none;font-size:12px;cursor:pointer" onclick="document.getElementById('showIgnored').checked=!document.getElementById('showIgnored').checked;renderTable()"></span>
<button onclick="renderTable()">&#x21bb; Refresh</button>
<button class="secondary" onclick="clearFilters()">Clear</button>
</div>
<div id="tableContainer">
<table>
<thead><tr>
<th onclick="sortBy('severity')">Severity<span class="sort" id="sort-severity"></span></th>
<th onclick="sortBy('detectorSource')">Source<span class="sort" id="sort-detectorSource"></span></th>
<th onclick="sortBy('message')">Message<span class="sort" id="sort-message"></span></th>
<th onclick="sortBy('filePath')">File<span class="sort" id="sort-filePath"></span></th>
<th onclick="sortBy('lineNumber')">Line<span class="sort" id="sort-lineNumber"></span></th>
<th>Mitigation</th>
<th>Action</th>
</tr></thead>
<tbody id="violationsBody"></tbody>
</table>
</div>
<div class="empty" id="emptyState">
<span class="icon">&#x2713;</span>
<span>No violations found</span>
</div>
<div id="ignoredBar" onclick="document.getElementById('showIgnored').checked=!document.getElementById('showIgnored').checked;renderTable()">
<span class="label">Ignored:</span>
<span id="ignoredErrorDot" class="ignored-dot error" onclick="event.stopPropagation();unignoreSeverity('error')" title="Click to unignore all errors">&#x25CF; E: 0</span>
<span id="ignoredWarningDot" class="ignored-dot warning" onclick="event.stopPropagation();unignoreSeverity('warning')" title="Click to unignore all warnings">&#x25CF; W: 0</span>
<span id="ignoredInfoDot" class="ignored-dot info" onclick="event.stopPropagation();unignoreSeverity('info')" title="Click to unignore all info">&#x25CF; I: 0</span>
</div>
<script id="violations-data" type="application/json">${dataJson}</script>
<script id="ignored-data" type="application/json">${ignoredJson}</script>
<script>
var violations = [];
try { violations = JSON.parse(document.getElementById('violations-data').textContent); } catch(e) {}
var ignoredSet = {};
try {
    var arr = JSON.parse(document.getElementById('ignored-data').textContent);
    for (var i = 0; i < arr.length; i++) ignoredSet[arr[i]] = true;
} catch(e) {}
var sortKey = 'severity';
var sortAsc = false;
var filteredRows = [];
var _vscode = acquireVsCodeApi();

function escapeAttr(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showNotif(msg, explanation) {
    var el = document.getElementById('notificationBar');
    var text = msg;
    if (explanation) text += ' \u2014 ' + explanation;
    document.getElementById('notifMsg').textContent = text;
    el.style.display = 'flex';
}

function hideNotif() {
    document.getElementById('notificationBar').style.display = 'none';
}

function renderTable() {
    var sourceVal = document.getElementById('sourceFilter').value;
    var severityVal = document.getElementById('severityFilter').value;
    var searchVal = document.getElementById('searchInput').value.toLowerCase();
    var showIgnored = document.getElementById('showIgnored').checked;

    filteredRows = [];
    for (var i = 0; i < violations.length; i++) {
        var v = violations[i];
        var isIgnored = ignoredSet[v.id] === true;
        if (!showIgnored && isIgnored) continue;
        if (sourceVal !== 'all' && v.detectorSource !== sourceVal) continue;
        if (severityVal !== 'all' && v.severity !== severityVal) continue;
        if (searchVal) {
            var m = (v.message || '').toLowerCase();
            var f = (v.filePath || '').toLowerCase();
            var r = (v.ruleName || '').toLowerCase();
            if (m.indexOf(searchVal) === -1 && f.indexOf(searchVal) === -1 && r.indexOf(searchVal) === -1) continue;
        }
        filteredRows.push(v);
    }

    filteredRows.sort(function(a, b) {
        var va, vb;
        if (sortKey === 'severity') {
            var order = { error: 0, warning: 1, info: 2 };
            va = order[a.severity] !== undefined ? order[a.severity] : 3;
            vb = order[b.severity] !== undefined ? order[b.severity] : 3;
        } else if (sortKey === 'lineNumber') {
            va = Number(a.lineNumber) || 0;
            vb = Number(b.lineNumber) || 0;
        } else {
            va = (a[sortKey] || '').toString().toLowerCase();
            vb = (b[sortKey] || '').toString().toLowerCase();
        }
        return va < vb ? (sortAsc ? -1 : 1) : (va > vb ? (sortAsc ? 1 : -1) : 0);
    });

    document.getElementById('violationCount').textContent = filteredRows.length + ' of ' + violations.length;

    // Count ignored by severity for bottom bar
    var ignoredCounts = { error: 0, warning: 0, info: 0 };
    var totalIgnored = 0;
    for (var i = 0; i < violations.length; i++) {
        if (ignoredSet[violations[i].id] === true) {
            var sev = violations[i].severity || 'info';
            if (ignoredCounts[sev] !== undefined) ignoredCounts[sev]++;
            totalIgnored++;
        }
    }
    document.getElementById('ignoredErrorDot').textContent = '\u25CF E: ' + ignoredCounts.error;
    document.getElementById('ignoredWarningDot').textContent = '\u25CF W: ' + ignoredCounts.warning;
    document.getElementById('ignoredInfoDot').textContent = '\u25CF I: ' + ignoredCounts.info;
    document.getElementById('ignoredBar').style.display = totalIgnored > 0 ? 'flex' : 'none';
    document.getElementById('ignoredBadgeArea').textContent = totalIgnored > 0 ? '\u00b7 ' + totalIgnored + ' ignored' : '';
    document.getElementById('ignoredBadgeArea').style.display = totalIgnored > 0 ? 'inline' : 'none';

    var tbody = document.getElementById('violationsBody');
    var empty = document.getElementById('emptyState');

    if (filteredRows.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';

    var html = '';
    for (var i = 0; i < filteredRows.length; i++) {
        var v = filteredRows[i];
        var isIgnored = ignoredSet[v.id] === true;
        var rowClass = isIgnored ? ' style="opacity:.4;text-decoration:line-through"' : '';
        var cls = 'badge badge-' + v.severity;
        var lbl = v.severity.charAt(0).toUpperCase() + v.severity.slice(1);
        var src = v.detectorSource || 'Unknown';
        var ln = v.lineNumber || '';
        var fp = escapeAttr(v.filePath);
        var act = isIgnored
            ? '<button class="action-btn unignore" onclick="return toggleIgnore(' + i + ')" title="Unignore this violation">\u21A9 Unignore</button>'
            : '<button class="action-btn ignore" onclick="return toggleIgnore(' + i + ')" title="Stop showing this violation">\u2715 Ignore</button>';
        var mit = v.mitigationHint ? escapeAttr(v.mitigationHint) : (v.explanation ? escapeAttr(v.explanation) : '');
        html += '<tr' + rowClass + '>';
        html += '<td><span class="' + cls + '">' + lbl + '</span></td>';
        html += '<td><span class="badge-source">' + escapeAttr(src) + '</span></td>';
        var tip = v.explanation ? 'Explanation: ' + escapeAttr(v.explanation) : escapeAttr(v.message);
        html += '<td class="message-cell" title="' + tip + '">' + escapeAttr(v.message) + '</td>';
        html += '<td class="file-cell"><span class="file-link" onclick="openViolationFile(' + i + ')">' + fp + '</span></td>';
        html += '<td>' + ln + '</td>';
        html += '<td class="hint-cell">' + mit + '</td>';
        html += '<td>' + act + '</td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function toggleIgnore(idx) {
    var v = filteredRows[idx];
    if (!v) return false;
    var isIgnored = ignoredSet[v.id] === true;
    _vscode.postMessage({
        command: isIgnored ? 'unignoreViolation' : 'ignoreViolation',
        id: v.id
    });
    return false;
}

function unignoreSeverity(severity) {
    for (var i = 0; i < violations.length; i++) {
        if (violations[i].severity === severity && ignoredSet[violations[i].id] === true) {
            _vscode.postMessage({ command: 'unignoreViolation', id: violations[i].id });
        }
    }
}

function openViolationFile(idx) {
    var v = filteredRows[idx];
    if (v && v.filePath) {
        _vscode.postMessage({ command: 'openFile', filePath: v.filePath, lineNumber: v.lineNumber, message: v.message });
        showNotif(v.message, v.explanation);
    }
}

function sortBy(key) {
    if (sortKey === key) sortAsc = !sortAsc;
    else { sortKey = key; sortAsc = true; }
    var els = document.querySelectorAll('.sort');
    for (var i = 0; i < els.length; i++) els[i].textContent = '';
    document.getElementById('sort-' + key).textContent = sortAsc ? '\u25B2' : '\u25BC';
    renderTable();
}

function clearFilters() {
    document.getElementById('sourceFilter').value = 'all';
    document.getElementById('severityFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    document.getElementById('showIgnored').checked = false;
    renderTable();
}

document.getElementById('sourceFilter').addEventListener('change', renderTable);
document.getElementById('severityFilter').addEventListener('change', renderTable);
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('showIgnored').addEventListener('change', renderTable);

renderTable();
</script>
</body>
</html>`;
    }
}
