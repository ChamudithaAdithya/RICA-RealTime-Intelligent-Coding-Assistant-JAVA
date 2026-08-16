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
exports.VscodeDiagnosticReporter = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Deterministic rule diagnostics and AI advisory findings go to SEPARATE VS Code
 * diagnostic collections so the two are visually distinct. Advisory findings
 * get a `RICA-AI` source and a `[RICA-AI]` message prefix.
 */
class VscodeDiagnosticReporter {
    constructor(collection, advisoryCollection) {
        this.collection = collection;
        this.advisoryCollection = advisoryCollection;
    }
    report(violations, ignoredIds) {
        this.collection.clear();
        this.advisoryCollection?.clear();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0)
            return;
        const workspaceFolder = workspaceFolders[0];
        const ruleMap = new Map();
        const advisoryMap = new Map();
        for (const v of violations) {
            if (!v.filePath)
                continue;
            if (ignoredIds.has(v.id))
                continue;
            const isAdvisory = v.detectorSource === 'AiAdvisory';
            const map = isAdvisory ? advisoryMap : ruleMap;
            const arr = map.get(v.filePath) || [];
            arr.push(v);
            map.set(v.filePath, arr);
        }
        for (const [relativePath, vlist] of ruleMap) {
            this.collection.set(workspaceUri(workspaceFolder, relativePath), toDiagnostics(vlist, false));
        }
        for (const [relativePath, vlist] of advisoryMap) {
            if (this.advisoryCollection) {
                this.advisoryCollection.set(workspaceUri(workspaceFolder, relativePath), toDiagnostics(vlist, true));
            }
        }
    }
    clear() {
        this.collection.clear();
        this.advisoryCollection?.clear();
    }
}
exports.VscodeDiagnosticReporter = VscodeDiagnosticReporter;
function workspaceUri(workspaceFolder, relativePath) {
    return vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
}
function toDiagnostics(vlist, advisory) {
    const diagnostics = [];
    const docBase = vscode.workspace
        .getConfiguration('javaAstAnalyzer')
        .get('documentationBaseUrl', 'http://localhost:5173')
        .replace(/\/+$/, '');
    for (const v of vlist) {
        let severity;
        switch (v.severity) {
            case 'error':
                severity = vscode.DiagnosticSeverity.Error;
                break;
            case 'warning':
                severity = vscode.DiagnosticSeverity.Warning;
                break;
            default:
                severity = vscode.DiagnosticSeverity.Information;
                break;
        }
        let range;
        if (v.range) {
            range = new vscode.Range(v.range.start.line - 1, v.range.start.character, v.range.end.line - 1, v.range.end.character);
        }
        else if (v.lineNumber) {
            range = new vscode.Range(v.lineNumber - 1, 0, v.lineNumber - 1, 0);
        }
        else {
            range = new vscode.Range(0, 0, 0, 0);
        }
        const severityLabel = v.severity === 'error' ? '[Error]' : v.severity === 'warning' ? '[Warning]' : '[Info]';
        const codePrefix = v.code ? `[${v.code}] ` : '';
        const tag = advisory ? '[RICA-AI] ' : '';
        const diag = new vscode.Diagnostic(range, `${tag}${codePrefix}${severityLabel} ${v.message}`, severity);
        diag.source = advisory ? 'RICA-AI' : 'Java Layer Analyzer';
        // Render the Problems-panel code as a clickable link to the matching docs page
        // when a per-violation documentationUrl is available (advisory findings have none).
        if (!advisory && v.documentationUrl) {
            const target = vscode.Uri.parse(`${docBase}${v.documentationUrl}.html`);
            diag.code = { value: v.id, target };
        }
        else {
            diag.code = v.id;
        }
        diagnostics.push(diag);
    }
    return diagnostics;
}
//# sourceMappingURL=vscodeDiagnosticReporter.js.map