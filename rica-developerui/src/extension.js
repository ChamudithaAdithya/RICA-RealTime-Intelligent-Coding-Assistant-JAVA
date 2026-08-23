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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const astManager_1 = require("./astManager");
const apiClient_1 = require("./apiClient");
const fileWatcher_1 = require("./fileWatcher");
const javaParser_1 = require("./infrastructure/javaParser");
const webviewPanel_1 = require("./webviewPanel");
const violationsWebviewPanel_1 = require("./violationsWebviewPanel");
const violationManager_1 = require("./violationManager");
const javaParserAdapter_1 = require("./infrastructure/javaParserAdapter");
const vscodeDiagnosticReporter_1 = require("./infrastructure/vscodeDiagnosticReporter");
const vscodeConfigProvider_1 = require("./infrastructure/vscodeConfigProvider");
const vscodeSourceProvider_1 = require("./infrastructure/vscodeSourceProvider");
const aiAdvisoryCoordinator_1 = require("./application/ai/aiAdvisoryCoordinator");
const ollamaAiAdapter_1 = require("./infrastructure/ai/ollamaAiAdapter");
const openaiCompatibleAiAdapter_1 = require("./infrastructure/ai/openaiCompatibleAiAdapter");
const fileAuditLogger_1 = require("./infrastructure/ai/fileAuditLogger");
const codeActionProvider_1 = require("./codeActionProvider");
const documentationCodeActionProvider_1 = require("./documentationCodeActionProvider");
let astManager;
let sourceProvider;
let apiClient;
let fileWatcher;
let javaParser;
let statusBarItem;
let outputChannel;
let violationManager;
let aiCoordinator;
let workspaceRoot;
async function activate(context) {
    outputChannel = vscode.window.createOutputChannel('Java AST Analyzer');
    outputChannel.appendLine('Java AST Analyzer is activating...');
    const config = vscode.workspace.getConfiguration('javaAstAnalyzer');
    const backendUrl = config.get('backendUrl', 'http://localhost:8082');
    const debounceDelay = config.get('debounceDelay', 1000);
    const autoAnalyze = config.get('autoAnalyzeOnOpen', true);
    const excludePatterns = config.get('excludePatterns', []);
    // Initialize domain-level infrastructure
    javaParser = new javaParser_1.JavaParser(outputChannel);
    apiClient = new apiClient_1.ApiClient(backendUrl, outputChannel);
    sourceProvider = new vscodeSourceProvider_1.VscodeSourceProvider(outputChannel);
    astManager = new astManager_1.ASTManager(javaParser, apiClient, sourceProvider, outputChannel, excludePatterns);
    // Clean Architecture wiring: ports → adapters
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('java-layer-analyzer');
    const advisoryDiagnosticCollection = vscode.languages.createDiagnosticCollection('rica-ai-advisory');
    context.subscriptions.push(diagnosticCollection, advisoryDiagnosticCollection);
    const diagnosticReporter = new vscodeDiagnosticReporter_1.VscodeDiagnosticReporter(diagnosticCollection, advisoryDiagnosticCollection);
    const parserService = new javaParserAdapter_1.JavaParserAdapter(javaParser);
    const configProvider = new vscodeConfigProvider_1.VscodeConfigProvider();
    const savedIgnoredIds = context.workspaceState.get('rica-ignored-violations', []);
    violationManager = new violationManager_1.ViolationManager(diagnosticReporter, parserService, configProvider, (ids) => context.workspaceState.update('rica-ignored-violations', ids), savedIgnoredIds);
    // AI Reasoning advisory wiring — pipeline (M5) + M6 quick-fix surface
    workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.globalStorageUri.fsPath;
    aiCoordinator = createAiCoordinator(vscode.workspace.getConfiguration('javaAstAnalyzer'));
    // AI Quick-Fix lightbulb actions (M6): reads violation.quickFix edits
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('java', new codeActionProvider_1.AiQuickFixCodeActionProvider(() => violationManager.getActiveViolations()), { providedCodeActionKinds: codeActionProvider_1.AiQuickFixCodeActionProvider.providedCodeActionKinds }));
    // Docs lightbulb: "Open RICA documentation" on every deterministic violation
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('java', new documentationCodeActionProvider_1.DocumentationCodeActionProvider(), { providedCodeActionKinds: documentationCodeActionProvider_1.DocumentationCodeActionProvider.providedCodeActionKinds }));
    context.subscriptions.push(vscode.commands.registerCommand('javaAstAnalyzer.openDocumentation', (url) => {
        if (url) {
            vscode.env.openExternal(vscode.Uri.parse(url));
        }
    }), vscode.commands.registerCommand('javaAstAnalyzer.showFixGuidance', codeActionProvider_1.showFixGuidance));
    fileWatcher = new fileWatcher_1.FileWatcher(astManager, violationManager, sourceProvider, outputChannel, debounceDelay);
    // Re-run analysis when relevant settings change
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('javaAstAnalyzer')) {
            outputChannel.appendLine('Configuration changed — re-analyzing...');
            astManager.setExcludePatterns(vscode.workspace.getConfiguration('javaAstAnalyzer').get('excludePatterns', []));
            aiCoordinator = createAiCoordinator(vscode.workspace.getConfiguration('javaAstAnalyzer'));
            violationManager.update();
            runAiAdvisory();
            updateStatusBar('ready');
        }
    }));
    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'javaAstAnalyzer.showStatus';
    statusBarItem.text = '$(coffee) RICA: Initializing...';
    statusBarItem.tooltip = 'RICA Architecture Analyzer';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('javaAstAnalyzer.analyzeProject', async () => {
        await analyzeFullProject();
    }), vscode.commands.registerCommand('javaAstAnalyzer.analyzeCurrentFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'java') {
            await analyzeSingleFile(editor.document);
        }
        else {
            vscode.window.showWarningMessage('No Java file is currently open');
        }
    }), vscode.commands.registerCommand('javaAstAnalyzer.showAstView', () => {
        webviewPanel_1.ASTWebviewPanel.createOrShow(context.extensionUri, apiClient);
    }), vscode.commands.registerCommand('javaAstAnalyzer.showViolationsView', () => {
        violationsWebviewPanel_1.ViolationsWebviewPanel.createOrShow(context.extensionUri, violationManager);
    }), vscode.commands.registerCommand('javaAstAnalyzer.openBrowserViewer', () => {
        const url = `${backendUrl}/view`;
        vscode.env.openExternal(vscode.Uri.parse(url));
    }), vscode.commands.registerCommand('javaAstAnalyzer.showStatus', () => {
        showStatusInfo();
    }), vscode.commands.registerCommand('javaAstAnalyzer.resetBackend', async () => {
        const answer = await vscode.window.showWarningMessage('Reset all backend AST data?', 'Yes', 'No');
        if (answer === 'Yes') {
            await apiClient.resetBackend();
            violationManager.clear();
            vscode.window.showInformationMessage('Backend data and local violations cleared');
            updateStatusBar('reset');
        }
    }));
    // Phase 6: RICA workspace commands
    context.subscriptions.push(vscode.commands.registerCommand('rica.analyzeProject', async () => {
        await analyzeFullProject();
    }), vscode.commands.registerCommand('rica.quickScanFile', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'java') {
            updateStatusBar('parsing');
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0)
                return;
            const relativePath = path.relative(workspaceFolders[0].uri.fsPath, activeEditor.document.uri.fsPath);
            await violationManager.onFileSaved(relativePath, activeEditor.document.getText());
            runAiAdvisory();
            updateStatusBar('ready');
        }
        else {
            vscode.window.showWarningMessage('No Java file is currently open');
        }
    }), vscode.commands.registerCommand('rica.aiReview', async () => {
        await runAiAdvisory('onDemand');
    }), vscode.commands.registerCommand('rica.showStatusSummary', () => {
        const stats = violationManager.getActiveViolationsSummary();
        vscode.window.showInformationMessage(`RICA Audit: ${stats.errors} errors, ${stats.warnings} warnings, ${stats.info} info across active layer topology`);
    }));
    // Start file watcher
    fileWatcher.start(context);
    // Watch for text document changes (in-editor edits before save)
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'java' && event.contentChanges.length > 0) {
            fileWatcher.onDocumentChanged(event.document);
        }
    }));
    // Watch for document saves
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'java') {
            fileWatcher.onDocumentSaved(document);
        }
    }));
    // Check backend health (non-blocking — local analysis works without it)
    const isHealthy = await apiClient.checkHealth();
    if (!isHealthy) {
        outputChannel.appendLine('Backend server not reachable — running in offline mode (analysis still works)');
        vscode.window.showWarningMessage('Backend server not reachable. AST viewer will be unavailable, but local analysis still works.', 'Open Settings').then(choice => {
            if (choice === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'javaAstAnalyzer');
            }
        });
        updateStatusBar('disconnected');
    }
    else {
        updateStatusBar('connected');
    }
    // Auto-analyze on open (runs regardless of backend health)
    if (autoAnalyze) {
        await analyzeFullProject();
    }
    outputChannel.appendLine('Java AST Analyzer activated successfully');
}
async function analyzeFullProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }
    updateStatusBar('analyzing');
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Java AST Analyzer',
        cancellable: true
    }, async (progress, token) => {
        try {
            progress.report({ message: 'Scanning for Java files...' });
            const result = await astManager.analyzeFullProject(workspaceFolders[0].uri.fsPath, workspaceFolders[0].name, (current, total, fileName) => {
                const pct = Math.round((current / total) * 100);
                progress.report({
                    message: `Parsing ${fileName} (${current}/${total})`,
                    increment: (1 / total) * 100
                });
            }, token);
            if (token.isCancellationRequested) {
                updateStatusBar('cancelled');
                return;
            }
            // Seed the violation manager's AST cache from the AST manager
            const allAsts = astManager.getAllCachedASTs();
            violationManager.seedCache(allAsts);
            // Run analysis
            violationManager.update();
            runAiAdvisory('onFullScan');
            updateStatusBar('ready', result.fileCount, violationManager.getActiveViolations().length);
            vscode.window.showInformationMessage(`Java AST: Analyzed ${result.fileCount} files (${result.nodeCount} nodes) in ${result.duration}ms`);
        }
        catch (error) {
            outputChannel.appendLine(`Error during full analysis: ${error.message}`);
            updateStatusBar('error');
            vscode.window.showErrorMessage(`AST Analysis failed: ${error.message}`);
        }
    });
}
/**
 * Fire-and-forget advisory pass. Config off, provider off, or events below the
 * configured trigger yield a no-op; every failure is logged and never throws.
 */
async function runAiAdvisory(trigger = 'onSave') {
    if (!aiCoordinator)
        return;
    const ai = aiCoordinator['deps'].config.ai;
    if (!ai.enableAiAdvisory || ai.aiProvider === 'off')
        return;
    if (trigger === 'onDemand' || triggerRank(trigger) >= triggerRank(ai.aiTrigger)) {
        try {
            const result = await aiCoordinator.run(violationManager.getDeterministicViolations());
            violationManager.setAdvisoryViolations(result.advisoryViolations);
            if (ai.aiTrigger === 'onDemand' && trigger === 'onDemand') {
                outputChannel.appendLine(`AI Review: ${result.annotatedCount} annotated, ${result.advisoryCount} advisory findings (${result.outcome})`);
            }
        }
        catch (error) {
            outputChannel.appendLine(`AI advisory pass failed: ${error.message}`);
        }
    }
}
/** event hierarchy: manual (0) < onSave (1) < onFullScan (2). */
function triggerRank(t) {
    return t === 'onDemand' ? 0 : t === 'onSave' ? 1 : 2;
}
/** Rebuild the AI coordinator from the current 'javaAstAnalyzer' workspace config. */
function createAiCoordinator(cfg) {
    const resolved = new vscodeConfigProvider_1.VscodeConfigProvider().getConfig();
    const aiConfig = {
        enableAiAdvisory: cfg.get('enableAiAdvisory', false),
        aiProvider: cfg.get('aiProvider', 'ollama'),
        aiEndpoint: cfg.get('aiEndpoint', 'http://localhost:11434'),
        aiModel: cfg.get('aiModel', 'qwen2.5-coder:7b'),
        aiMaxTokensPerRequest: cfg.get('aiMaxTokensPerRequest', 2000),
        aiTimeoutMs: cfg.get('aiTimeoutMs', 30000),
        aiMaxCandidatesPerRun: cfg.get('aiMaxCandidatesPerRun', 8),
        aiTrigger: cfg.get('aiTrigger', 'onDemand'),
        aiAuditLogEnabled: cfg.get('aiAuditLogEnabled', true),
    };
    const timeout = { timeoutMs: aiConfig.aiTimeoutMs, maxTokensPerRequest: aiConfig.aiMaxTokensPerRequest };
    const provider = aiConfig.aiProvider === 'openai-compatible'
        ? new openaiCompatibleAiAdapter_1.OpenAICompatibleAiAdapter(aiConfig.aiEndpoint, aiConfig.aiModel, timeout)
        : new ollamaAiAdapter_1.OllamaAiAdapter(aiConfig.aiEndpoint, aiConfig.aiModel, timeout);
    const auditLogger = new fileAuditLogger_1.FileAuditLogger(workspaceRoot);
    return new aiAdvisoryCoordinator_1.AiAdvisoryCoordinator({
        config: { ...resolved, ai: aiConfig },
        provider,
        auditLogger,
        getFilesMap: () => violationManager.getFilesMap(),
        getGraph: () => violationManager.getProjectGraph(),
        readSource: (relativePath) => {
            try {
                return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
            }
            catch {
                return undefined;
            }
        },
    });
}
async function analyzeSingleFile(document) {
    try {
        updateStatusBar('parsing');
        await astManager.analyzeFile(document.uri.fsPath, document.getText(), 'changed');
        // Seed the single-file AST into the violation manager
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const relativePath = path.relative(workspaceFolders[0].uri.fsPath, document.uri.fsPath);
            const ast = astManager.getCachedAST(relativePath);
            if (ast) {
                violationManager.seedFileCache(relativePath, ast);
            }
        }
        violationManager.update();
        updateStatusBar('ready', undefined, violationManager.getActiveViolations().length);
    }
    catch (error) {
        outputChannel.appendLine(`Error analyzing file: ${error.message}`);
        vscode.window.showErrorMessage(`Failed to analyze: ${error.message}`);
    }
}
function updateStatusBar(state, fileCount, violationCount) {
    switch (state) {
        case 'connected':
            statusBarItem.text = '$(coffee) RICA: Connected';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'disconnected':
            statusBarItem.text = '$(coffee) RICA: Offline';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
        case 'analyzing':
            statusBarItem.text = '$(sync~spin) RICA: Traversing graph...';
            statusBarItem.tooltip = 'RICA is running the full architecture analysis pipeline.';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'parsing':
            statusBarItem.text = '$(sync~spin) RICA: Building AST...';
            statusBarItem.tooltip = 'RICA is parsing Java files into an abstract syntax tree.';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'ready': {
            const vCount = violationCount !== undefined ? violationCount : violationManager.getActiveViolations().length;
            if (vCount > 0) {
                const stats = violationManager.getActiveViolationsSummary();
                statusBarItem.text = `$(warning) RICA: ${fileCount || '?'} files | ${vCount} violations`;
                statusBarItem.tooltip = `RICA Architecture Audit\n${fileCount || '?'} files analyzed\n${stats.errors} errors · ${stats.warnings} warnings · ${stats.info} info\nClick for quick actions`;
            }
            else {
                statusBarItem.text = `$(check) RICA: ${fileCount || '?'} files | 0 violations`;
                statusBarItem.tooltip = `RICA Architecture Audit — No violations found\n${fileCount || '?'} files analyzed\nClick for quick actions`;
            }
            statusBarItem.backgroundColor = undefined;
            break;
        }
        case 'error':
            statusBarItem.text = '$(coffee) RICA: Error';
            statusBarItem.tooltip = 'RICA encountered an error during analysis.';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            break;
        case 'cancelled':
            statusBarItem.text = '$(coffee) RICA: Cancelled';
            statusBarItem.tooltip = 'Analysis was cancelled.';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'reset':
            statusBarItem.text = '$(coffee) RICA: Reset';
            statusBarItem.tooltip = 'All data cleared.';
            statusBarItem.backgroundColor = undefined;
            break;
    }
}
async function showStatusInfo() {
    const stats = violationManager.getActiveViolationsSummary();
    const items = [
        { label: '$(search) Analyze Full Project', description: 'Re-scan and parse all Java files' },
        { label: '$(file-code) Quick Scan Current File', description: 'Run delta analysis on the active file' },
        { label: '$(info) Show Audit Summary', description: `${stats.total} total violations — ${stats.errors} errors, ${stats.warnings} warnings` },
        { label: '$(browser) Open Browser Viewer', description: 'View AST in browser' },
        { label: '$(preview) Open AST Panel', description: 'View AST in VS Code panel' },
        { label: '$(warning) Open Violations Panel', description: 'View architecture violations' },
        { label: '$(trash) Reset Backend Data', description: 'Clear all stored AST data' }
    ];
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'RICA Architecture Analyzer Actions'
    });
    if (!selected)
        return;
    switch (selected.label) {
        case '$(search) Analyze Full Project':
            vscode.commands.executeCommand('javaAstAnalyzer.analyzeProject');
            break;
        case '$(file-code) Quick Scan Current File':
            vscode.commands.executeCommand('rica.quickScanFile');
            break;
        case '$(info) Show Audit Summary':
            vscode.commands.executeCommand('rica.showStatusSummary');
            break;
        case '$(browser) Open Browser Viewer':
            vscode.commands.executeCommand('javaAstAnalyzer.openBrowserViewer');
            break;
        case '$(preview) Open AST Panel':
            vscode.commands.executeCommand('javaAstAnalyzer.showAstView');
            break;
        case '$(warning) Open Violations Panel':
            vscode.commands.executeCommand('javaAstAnalyzer.showViolationsView');
            break;
        case '$(trash) Reset Backend Data':
            vscode.commands.executeCommand('javaAstAnalyzer.resetBackend');
            break;
    }
}
function deactivate() {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}
//# sourceMappingURL=extension.js.map