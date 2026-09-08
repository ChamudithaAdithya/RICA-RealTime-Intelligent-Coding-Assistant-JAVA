import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ASTManager } from './core/astManager';
import { ApiClient } from './apiClient';
import { BackendService } from './application/ports/backendService';
import { SourceProvider } from './application/ports/sourceProvider';
import { FileWatcher } from './infrastructure/fileWatcher';
import { JavaParser } from './infrastructure/javaParser';
import { ViolationsWebviewPanel } from './ui/violationsWebviewPanel';
import { ViolationManager } from './core/violationManager';
import { JavaParserAdapter } from './infrastructure/javaParserAdapter';
import { VscodeDiagnosticReporter } from './infrastructure/vscodeDiagnosticReporter';
import { VscodeConfigProvider } from './infrastructure/vscodeConfigProvider';
import { VscodeSourceProvider } from './infrastructure/vscodeSourceProvider';
import { FullASTOutput } from './domain/astTypes';
import { AiAdvisoryCoordinator } from './application/ai/aiAdvisoryCoordinator';
import { OllamaAiAdapter } from './infrastructure/ai/ollamaAiAdapter';
import { OpenAICompatibleAiAdapter } from './infrastructure/ai/openaiCompatibleAiAdapter';
import { FileAuditLogger } from './infrastructure/ai/fileAuditLogger';
import { AiQuickFixCodeActionProvider, showFixGuidance } from './ui/codeActionProvider';
import { DocumentationCodeActionProvider } from './ui/documentationCodeActionProvider';
import { openRicaDocumentation } from './ui/documentation';
import { ensureRicaWorkspaceGitignore } from './infrastructure/ricaWorkspaceArtifacts';
import { AiConfig, DEFAULT_AI_CONFIG } from './domain/analyzerConfig';

const OPENAI_API_KEY_SECRET = 'rica.openaiApiKey';

let astManager: ASTManager;
let sourceProvider: SourceProvider;
let apiClient: ApiClient;
let fileWatcher: FileWatcher;
let javaParser: JavaParser;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let violationManager: ViolationManager;
let aiCoordinator: AiAdvisoryCoordinator | undefined;
let workspaceRoot: string;
let currentAiConfig: AiConfig = { ...DEFAULT_AI_CONFIG };

export async function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Java AST Analyzer');
    outputChannel.appendLine('Java AST Analyzer is activating...');

    const config = vscode.workspace.getConfiguration('javaAstAnalyzer');
    const backendUrl = config.get<string>('backendUrl', 'http://localhost:8082');
    const debounceDelay = config.get<number>('debounceDelay', 1000);
    const autoAnalyze = config.get<boolean>('autoAnalyzeOnOpen', true);
    const excludePatterns = config.get<string[]>('excludePatterns', []);

    // Initialize domain-level infrastructure
    javaParser = new JavaParser(outputChannel);
    apiClient = new ApiClient(backendUrl, outputChannel);
    sourceProvider = new VscodeSourceProvider(outputChannel);
    astManager = new ASTManager(javaParser, apiClient, sourceProvider, outputChannel, excludePatterns);

    // Clean Architecture wiring: ports → adapters
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('java-layer-analyzer');
    const advisoryDiagnosticCollection = vscode.languages.createDiagnosticCollection('rica-ai-advisory');
    context.subscriptions.push(diagnosticCollection, advisoryDiagnosticCollection);

    const diagnosticReporter = new VscodeDiagnosticReporter(diagnosticCollection, advisoryDiagnosticCollection);
    const parserService = new JavaParserAdapter(javaParser);
    const configProvider = new VscodeConfigProvider();

    const savedIgnoredIds = context.workspaceState.get<string[]>('rica-ignored-violations', []);

    violationManager = new ViolationManager(
        diagnosticReporter,
        parserService,
        configProvider,
        (ids) => context.workspaceState.update('rica-ignored-violations', ids),
        savedIgnoredIds,
    );

    // AI Reasoning advisory wiring — pipeline (M5) + M6 quick-fix surface
    workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.globalStorageUri.fsPath;
    aiCoordinator = await createAiCoordinator(
        vscode.workspace.getConfiguration('javaAstAnalyzer'),
        context.secrets,
    );

    // AI Quick-Fix lightbulb actions (M6): reads violation.quickFix edits
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            'java',
            new AiQuickFixCodeActionProvider(() => violationManager.getActiveViolations()),
            { providedCodeActionKinds: AiQuickFixCodeActionProvider.providedCodeActionKinds },
        ),
    );

    // Docs lightbulb: "Open RICA documentation" on every deterministic violation
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            'java',
            new DocumentationCodeActionProvider(() => violationManager.getActiveViolations()),
            { providedCodeActionKinds: DocumentationCodeActionProvider.providedCodeActionKinds },
        ),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('javaAstAnalyzer.openDocumentation', (url?: string) => {
            return openRicaDocumentation(context.extensionUri, url);
        }),
        vscode.commands.registerCommand('javaAstAnalyzer.ignoreViolation', ignoreViolationWithConfirmation),
        vscode.commands.registerCommand('javaAstAnalyzer.showFixGuidance', showFixGuidance),
        vscode.window.registerUriHandler({
            handleUri: (uri: vscode.Uri) => {
                const target = uri.path.replace(/^\/+/, '') || '/index.html';
                return openRicaDocumentation(context.extensionUri, target);
            },
        }),
    );

    fileWatcher = new FileWatcher(astManager, violationManager, sourceProvider, outputChannel, debounceDelay);

    // Re-run analysis when relevant settings change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration('javaAstAnalyzer')) {
                outputChannel.appendLine('Configuration changed — re-analyzing...');
                astManager.setExcludePatterns(
                    vscode.workspace.getConfiguration('javaAstAnalyzer').get<string[]>('excludePatterns', [])
                );
                aiCoordinator = await createAiCoordinator(
                    vscode.workspace.getConfiguration('javaAstAnalyzer'),
                    context.secrets,
                );
                violationManager.update();
                updateStatusBar('ready');
            }
        })
    );

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'javaAstAnalyzer.showStatus';
    statusBarItem.text = '$(coffee) RICA: Initializing...';
    statusBarItem.tooltip = 'RICA Architecture Analyzer';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('javaAstAnalyzer.analyzeProject', async () => {
            await analyzeFullProject();
        }),

        vscode.commands.registerCommand('javaAstAnalyzer.analyzeCurrentFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'java') {
                await analyzeSingleFile(editor.document);
            } else {
                vscode.window.showWarningMessage('No Java file is currently open');
            }
        }),

        vscode.commands.registerCommand('javaAstAnalyzer.exportAnalysisSnapshot', async () => {
            await exportAnalysisSnapshot();
        }),

        vscode.commands.registerCommand('javaAstAnalyzer.showViolationsView', () => {
            ViolationsWebviewPanel.createOrShow(context.extensionUri, violationManager);
        }),

        vscode.commands.registerCommand('javaAstAnalyzer.openBrowserViewer', async () => {
            const isHealthy = await apiClient.checkHealth();
            if (!isHealthy) {
                vscode.window.showWarningMessage('Backend server is not reachable. The browser AST viewer is unavailable in offline mode.');
                updateStatusBar('disconnected');
                return;
            }
            const url = `${backendUrl}/view`;
            vscode.env.openExternal(vscode.Uri.parse(url));
        }),

        vscode.commands.registerCommand('javaAstAnalyzer.showStatus', () => {
            showStatusInfo();
        }),

        vscode.commands.registerCommand('javaAstAnalyzer.resetBackend', async () => {
            const answer = await vscode.window.showWarningMessage(
                'Reset all backend AST data?',
                'Yes', 'No'
            );
            if (answer === 'Yes') {
                violationManager.clear();
                try {
                    await apiClient.resetBackend();
                    vscode.window.showInformationMessage('Backend data and local violations cleared');
                    updateStatusBar('reset');
                } catch (error: any) {
                    outputChannel.appendLine(`Backend reset failed: ${error.message}`);
                    vscode.window.showWarningMessage('Backend is unavailable. Local violations were cleared, but backend data could not be reset.');
                    updateStatusBar('disconnected');
                }
            }
        }),
    );

    // Phase 6: RICA workspace commands
    context.subscriptions.push(
        vscode.commands.registerCommand('rica.analyzeProject', async () => {
            await analyzeFullProject();
        }),

        vscode.commands.registerCommand('rica.quickScanFile', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'java') {
                updateStatusBar('parsing');
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) return;
                const relativePath = path.relative(
                    workspaceFolders[0].uri.fsPath,
                    activeEditor.document.uri.fsPath
                );
                violationManager.onFileSaved(relativePath, activeEditor.document.getText());
                await runAiAdvisory('onSave');
                updateStatusBar('ready');
            } else {
                vscode.window.showWarningMessage('No Java file is currently open');
            }
        }),

        vscode.commands.registerCommand('rica.aiReview', async () => {
            await runAiAdvisory('onDemand');
        }),

        vscode.commands.registerCommand('rica.setOpenAiApiKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                title: 'RICA: Set OpenAI API Key',
                prompt: 'Enter an OpenAI Platform API key. It will be stored in VS Code Secret Storage.',
                placeHolder: 'sk-...',
                password: true,
                ignoreFocusOut: true,
                validateInput: value => value.trim() ? undefined : 'An API key is required.',
            });
            if (apiKey === undefined) return;
            await context.secrets.store(OPENAI_API_KEY_SECRET, apiKey.trim());
            aiCoordinator = await createAiCoordinator(
                vscode.workspace.getConfiguration('javaAstAnalyzer'),
                context.secrets,
            );
            vscode.window.showInformationMessage('RICA stored the OpenAI API key securely. Run “RICA: Run AI Advisory Review” to test it.');
        }),

        vscode.commands.registerCommand('rica.clearOpenAiApiKey', async () => {
            await context.secrets.delete(OPENAI_API_KEY_SECRET);
            aiCoordinator = await createAiCoordinator(
                vscode.workspace.getConfiguration('javaAstAnalyzer'),
                context.secrets,
            );
            vscode.window.showInformationMessage('RICA removed the API key from VS Code Secret Storage.');
        }),

        vscode.commands.registerCommand('rica.openAiAuditLog', async () => {
            const auditUri = vscode.Uri.file(path.join(workspaceRoot, '.rica', 'ai-audit.jsonl'));
            try {
                await vscode.workspace.fs.stat(auditUri);
                const document = await vscode.workspace.openTextDocument(auditUri);
                await vscode.window.showTextDocument(document, { preview: false });
            } catch {
                vscode.window.showInformationMessage(
                    'No AI audit log exists yet. A log is created after a review has eligible candidates and AI audit logging is enabled.'
                );
            }
        }),

        vscode.commands.registerCommand('rica.showStatusSummary', () => {
            const stats = violationManager.getActiveViolationsSummary();
            vscode.window.showInformationMessage(
                `RICA Audit: ${stats.errors} errors, ${stats.warnings} warnings, ${stats.info} info across active layer topology`
            );
        }),
    );

    // Start file watcher
    fileWatcher.start(context);

    // Watch for text document changes (in-editor edits before save)
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'java' && event.contentChanges.length > 0) {
                fileWatcher.onDocumentChanged(event.document);
            }
        })
    );

    // Watch for document saves
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async document => {
            if (document.languageId === 'java') {
                await fileWatcher.onDocumentSaved(document);
                await runAiAdvisory('onSave');
            }
        })
    );

    // Check backend health (non-blocking — local analysis works without it)
    const isHealthy = await apiClient.checkHealth();
    if (!isHealthy) {
        outputChannel.appendLine('Backend server not reachable — running in offline mode (analysis still works)');
        vscode.window.showWarningMessage(
            'Backend server not reachable. AST viewer will be unavailable, but local analysis still works.',
            'Open Settings'
        ).then(choice => {
            if (choice === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'javaAstAnalyzer');
            }
        });
        updateStatusBar('disconnected');
    } else {
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

            const result = await astManager.analyzeFullProject(
                workspaceFolders[0].uri.fsPath,
                workspaceFolders[0].name,
                (current, total, fileName) => {
                    const pct = Math.round((current / total) * 100);
                    progress.report({
                        message: `Parsing ${fileName} (${current}/${total})`,
                        increment: (1 / total) * 100
                    });
                },
                token
            );

            if (token.isCancellationRequested) {
                updateStatusBar('cancelled');
                return;
            }

            // Seed the violation manager's AST cache from the AST manager
            const allAsts = astManager.getAllCachedASTs() as FullASTOutput[];
            violationManager.seedCache(allAsts);

            // Run analysis
            violationManager.update();
            await runAiAdvisory('onFullScan');
            updateStatusBar('ready', result.fileCount, violationManager.getActiveViolations().length);
            vscode.window.showInformationMessage(
                `Java AST: Analyzed ${result.fileCount} files (${result.nodeCount} nodes) in ${result.duration}ms`
            );
        } catch (error: any) {
            outputChannel.appendLine(`Error during full analysis: ${error.message}`);
            updateStatusBar('error');
            vscode.window.showErrorMessage(`AST Analysis failed: ${error.message}`);
        }
    });
}

async function ignoreViolationWithConfirmation(id?: string): Promise<void> {
    if (!id) return;
    const violation = violationManager.getActiveViolations().find(v => v.id === id);
    const label = violation?.code ? `${violation.code}: ${violation.message}` : id;
    const first = await vscode.window.showWarningMessage(
        `Ignore this RICA finding as a false positive?\n\n${label}`,
        { modal: true },
        'Continue',
    );
    if (first !== 'Continue') return;

    const second = await vscode.window.showWarningMessage(
        'This will hide only this exact finding in this workspace. You can show and restore ignored findings from the Architecture Violations panel.',
        { modal: true },
        'Ignore Finding',
    );
    if (second !== 'Ignore Finding') return;

    violationManager.ignoreViolation(id);
    vscode.window.showInformationMessage(`RICA ignored ${violation?.code || 'the selected finding'} as a false positive.`);
}

/** Run the optional advisory pass without allowing provider failures to break analysis. */
async function runAiAdvisory(trigger: 'onDemand' | 'onSave' | 'onFullScan' = 'onSave'): Promise<void> {
    if (!aiCoordinator) return;
    const ai = currentAiConfig;
    const manual = trigger === 'onDemand';

    if (!ai.enableAiAdvisory || ai.aiProvider === 'off') {
        if (manual) {
            const choice = await vscode.window.showWarningMessage(
                'RICA AI Advisory is disabled. Enable it and select the OpenAI-compatible provider in Settings.',
                'Open Settings',
            );
            if (choice === 'Open Settings') {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'javaAstAnalyzer.enableAiAdvisory');
            }
        }
        return;
    }

    // Automated runs must match the selected trigger exactly. Manual review is
    // always allowed; selecting onDemand must not accidentally run on every save.
    if (!manual && trigger !== ai.aiTrigger) return;

    if (usesOfficialOpenAiEndpoint(ai) && !ai.aiApiKey?.trim()) {
        if (manual) {
            const choice = await vscode.window.showWarningMessage(
                'RICA needs an OpenAI API key before it can run the AI Advisory review.',
                'Set API Key',
            );
            if (choice === 'Set API Key') {
                await vscode.commands.executeCommand('rica.setOpenAiApiKey');
            }
        }
        return;
    }

    if (manual && Object.keys(violationManager.getFilesMap()).length === 0) {
        const choice = await vscode.window.showInformationMessage(
            'RICA needs a project analysis before the AI Advisory review.',
            'Analyze Project',
        );
        if (choice !== 'Analyze Project') return;
        await analyzeFullProject();
    }

    try {
        outputChannel.appendLine(
            `AI Review starting: provider=${ai.aiProvider}, model=${ai.aiModel}, trigger=${trigger}`
        );
        const executeReview = () => aiCoordinator!.run(violationManager.getDeterministicViolations());
        const result = manual
            ? await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `RICA AI Advisory — ${ai.aiModel}`,
                    cancellable: false,
                },
                async progress => {
                    progress.report({ message: 'Checking provider and reviewing eligible findings...' });
                    return executeReview();
                },
            )
            : await executeReview();
        violationManager.setAdvisoryViolations(result.advisoryViolations);
        outputChannel.appendLine(
            `AI Review: model=${ai.aiModel}, candidates=${result.candidateCount}, annotated=${result.annotatedCount}, advisory=${result.advisoryCount}, outcome=${result.outcome}, latency=${result.latencyMs}ms`
        );

        if (!manual) return;
        if (result.outcome === 'ai') {
            const choice = await vscode.window.showInformationMessage(
                `${ai.aiModel} reviewed ${result.candidateCount} candidate(s): ${result.annotatedCount} annotated and ${result.advisoryCount} advisory findings added.`,
                'Open Violations',
                'Open AI Audit Log',
            );
            if (choice === 'Open Violations') await vscode.commands.executeCommand('javaAstAnalyzer.showViolationsView');
            if (choice === 'Open AI Audit Log') await vscode.commands.executeCommand('rica.openAiAuditLog');
        } else if (result.outcome === 'heuristic' || result.outcome === 'offline') {
            if (ai.aiProvider === 'openai-compatible') {
                const choice = await vscode.window.showWarningMessage(
                    'The OpenAI-compatible provider could not be reached or authenticated. RICA completed only its local heuristic review.',
                    'Set API Key',
                    'Show Output',
                );
                if (choice === 'Set API Key') await vscode.commands.executeCommand('rica.setOpenAiApiKey');
                if (choice === 'Show Output') outputChannel.show(true);
            } else {
                const choice = await vscode.window.showWarningMessage(
                    'Ollama could not be reached. RICA completed only its local heuristic review.',
                    'Show Output',
                );
                if (choice === 'Show Output') outputChannel.show(true);
            }
        } else if (result.outcome === 'error') {
            const choice = await vscode.window.showErrorMessage(
                `RICA AI review failed: ${result.error ?? 'Unknown provider error'}`,
                'Show Output',
            );
            if (choice === 'Show Output') outputChannel.show(true);
        } else {
            vscode.window.showInformationMessage(
                'RICA found no eligible AI Advisory candidates. No model request was sent and no API tokens were used.'
            );
        }
    } catch (error: any) {
        outputChannel.appendLine(`AI advisory pass failed: ${error.message}`);
        if (manual) vscode.window.showErrorMessage(`RICA AI advisory failed: ${error.message}`);
    }
}

function usesOfficialOpenAiEndpoint(ai: AiConfig): boolean {
    if (ai.aiProvider !== 'openai-compatible') return false;
    try {
        const hostname = new URL(ai.aiEndpoint).hostname.toLowerCase();
        return hostname === 'api.openai.com' || hostname.endsWith('.api.openai.com');
    } catch {
        return false;
    }
}

/** Rebuild the AI coordinator from the current 'javaAstAnalyzer' workspace config. */
async function createAiCoordinator(
    cfg: vscode.WorkspaceConfiguration,
    secrets: vscode.SecretStorage,
): Promise<AiAdvisoryCoordinator> {
    const resolved = new VscodeConfigProvider().getConfig();
    const secretApiKey = await secrets.get(OPENAI_API_KEY_SECRET);
    const aiConfig: AiConfig = {
        enableAiAdvisory: cfg.get<boolean>('enableAiAdvisory', DEFAULT_AI_CONFIG.enableAiAdvisory),
        aiProvider: cfg.get<AiConfig['aiProvider']>('aiProvider', DEFAULT_AI_CONFIG.aiProvider),
        aiEndpoint: cfg.get<string>('aiEndpoint', DEFAULT_AI_CONFIG.aiEndpoint).trim(),
        aiApiKey: (secretApiKey || cfg.get<string>('aiApiKey', DEFAULT_AI_CONFIG.aiApiKey ?? '')).trim(),
        aiModel: cfg.get<string>('aiModel', DEFAULT_AI_CONFIG.aiModel).trim(),
        aiMaxTokensPerRequest: cfg.get<number>('aiMaxTokensPerRequest', DEFAULT_AI_CONFIG.aiMaxTokensPerRequest),
        aiTimeoutMs: cfg.get<number>('aiTimeoutMs', DEFAULT_AI_CONFIG.aiTimeoutMs),
        aiMaxCandidatesPerRun: cfg.get<number>('aiMaxCandidatesPerRun', DEFAULT_AI_CONFIG.aiMaxCandidatesPerRun),
        aiTrigger: cfg.get<AiConfig['aiTrigger']>('aiTrigger', DEFAULT_AI_CONFIG.aiTrigger),
        aiAuditLogEnabled: cfg.get<boolean>('aiAuditLogEnabled', DEFAULT_AI_CONFIG.aiAuditLogEnabled),
    };
    currentAiConfig = aiConfig;
    const timeout = {
        timeoutMs: aiConfig.aiTimeoutMs,
        maxTokensPerRequest: aiConfig.aiMaxTokensPerRequest,
        apiKey: aiConfig.aiApiKey,
    };
    const provider = aiConfig.aiProvider === 'openai-compatible'
        ? new OpenAICompatibleAiAdapter(aiConfig.aiEndpoint, aiConfig.aiModel, timeout)
        : new OllamaAiAdapter(aiConfig.aiEndpoint, aiConfig.aiModel, timeout);
    const auditLogger = new FileAuditLogger(workspaceRoot);

    return new AiAdvisoryCoordinator({
        config: { ...resolved, ai: aiConfig },
        provider,
        auditLogger,
        getFilesMap: () => violationManager.getFilesMap(),
        getGraph: () => violationManager.getProjectGraph(),
        readSource: (relativePath) => {
            try {
                return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
            } catch {
                return undefined;
            }
        },
    });
}

async function analyzeSingleFile(document: vscode.TextDocument) {
    try {
        updateStatusBar('parsing');
        await astManager.analyzeFile(document.uri.fsPath, document.getText(), 'changed');

        // Seed the single-file AST into the violation manager
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const relativePath = path.relative(workspaceFolders[0].uri.fsPath, document.uri.fsPath);
            const ast = astManager.getCachedAST(relativePath) as FullASTOutput | undefined;
            if (ast) {
                violationManager.seedFileCache(relativePath, ast);
            }
        }

        violationManager.update();
        updateStatusBar('ready', undefined, violationManager.getActiveViolations().length);
    } catch (error: any) {
        outputChannel.appendLine(`Error analyzing file: ${error.message}`);
        vscode.window.showErrorMessage(`Failed to analyze: ${error.message}`);
    }
}

function updateStatusBar(state: string, fileCount?: number, violationCount?: number) {
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
            } else {
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
    const items: vscode.QuickPickItem[] = [
        { label: '$(search) Analyze Full Project', description: 'Re-scan and parse all Java files' },
        { label: '$(file-code) Quick Scan Current File', description: 'Run delta analysis on the active file' },
        { label: '$(info) Show Audit Summary', description: `${stats.total} total violations — ${stats.errors} errors, ${stats.warnings} warnings` },
        { label: '$(json) Export Analysis Snapshot', description: 'Write ASTs, graph, violations, incremental maps, stats, and config as JSON' },
        { label: '$(browser) Open Browser Viewer', description: 'View AST in browser' },
        { label: '$(warning) Open Violations Panel', description: 'View architecture violations' },
        { label: '$(sparkle) Run AI Advisory Review', description: `Use ${currentAiConfig.aiModel} to review eligible findings` },
        { label: '$(key) Set OpenAI API Key', description: 'Store the key securely in VS Code Secret Storage' },
        { label: '$(output) Open AI Audit Log', description: 'Inspect model decisions and reasoning from previous reviews' },
        { label: '$(trash) Reset Backend Data', description: 'Clear all stored AST data' }
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'RICA Architecture Analyzer Actions'
    });

    if (!selected) return;

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
        case '$(json) Export Analysis Snapshot':
            vscode.commands.executeCommand('javaAstAnalyzer.exportAnalysisSnapshot');
            break;
        case '$(browser) Open Browser Viewer':
            vscode.commands.executeCommand('javaAstAnalyzer.openBrowserViewer');
            break;
        case '$(warning) Open Violations Panel':
            vscode.commands.executeCommand('javaAstAnalyzer.showViolationsView');
            break;
        case '$(sparkle) Run AI Advisory Review':
            vscode.commands.executeCommand('rica.aiReview');
            break;
        case '$(key) Set OpenAI API Key':
            vscode.commands.executeCommand('rica.setOpenAiApiKey');
            break;
        case '$(output) Open AI Audit Log':
            vscode.commands.executeCommand('rica.openAiAuditLog');
            break;
        case '$(trash) Reset Backend Data':
            vscode.commands.executeCommand('javaAstAnalyzer.resetBackend');
            break;
    }
}

async function exportAnalysisSnapshot(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('Open a Java workspace before exporting the RICA analysis snapshot.');
        return;
    }

    if (Object.keys(violationManager.getFilesMap()).length === 0) {
        const answer = await vscode.window.showInformationMessage(
            'RICA has no AST cache yet. Analyze the full project first?',
            'Analyze Now',
            'Export Empty Snapshot',
            'Cancel',
        );
        if (answer === 'Analyze Now') {
            await analyzeFullProject();
        } else if (answer !== 'Export Empty Snapshot') {
            return;
        }
    }

    const root = workspaceFolders[0].uri.fsPath;
    await ensureRicaWorkspaceGitignore(root);
    const snapshotRoot = vscode.Uri.file(path.join(root, '.rica', 'analysis-snapshot'));
    const astDir = vscode.Uri.joinPath(snapshotRoot, 'asts');
    await vscode.workspace.fs.createDirectory(astDir);

    const snapshot = violationManager.getAnalysisSnapshot() as {
        generatedAt?: string;
        asts?: Record<string, unknown>;
        dependencyGraph?: unknown;
        violations?: unknown;
        incremental?: unknown;
        stats?: unknown;
        config?: unknown;
    };

    await writeJson(snapshotRoot, 'all-asts.json', snapshot.asts || {});
    await writeJson(snapshotRoot, 'dependency-graph.json', snapshot.dependencyGraph || {});
    await writeJson(snapshotRoot, 'violations.json', snapshot.violations || {});
    await writeJson(snapshotRoot, 'incremental-maps.json', snapshot.incremental || {});
    await writeJson(snapshotRoot, 'stats.json', snapshot.stats || {});
    await writeJson(snapshotRoot, 'config.json', snapshot.config || {});
    await writeJson(snapshotRoot, 'full-snapshot.json', snapshot);

    for (const [filePath, ast] of Object.entries(snapshot.asts || {})) {
        await writeJson(astDir, `${safeSnapshotFileName(filePath)}.ast.json`, ast);
    }

    const readme = [
        '# RICA Analysis Snapshot',
        '',
        `Generated: ${snapshot.generatedAt || new Date().toISOString()}`,
        `Workspace: ${root}`,
        '',
        '## Files',
        '',
        '- `full-snapshot.json`: everything in one JSON document.',
        '- `all-asts.json`: AST facts for every parsed Java file.',
        '- `asts/*.ast.json`: one AST JSON file per Java source file.',
        '- `dependency-graph.json`: graph nodes and edges used by cross-file rules.',
        '- `violations.json`: active, deterministic, advisory, ignored, and summary violation data.',
        '- `incremental-maps.json`: dependencies and dependents used for incremental blast-radius revalidation.',
        '- `stats.json`: file, graph, violation, ignored, advisory, and layer counts.',
        '- `config.json`: analyzer settings used by the current run.',
        '',
        '## Suggested Defence Wording',
        '',
        'RICA keeps AST facts, dependency graph data, violation results, and incremental invalidation maps in memory. This snapshot command exports those internal structures so they can be inspected directly.',
        '',
    ].join('\n');
    await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(snapshotRoot, 'README.md'),
        Buffer.from(readme, 'utf8'),
    );

    const indexUri = vscode.Uri.joinPath(snapshotRoot, 'README.md');
    const doc = await vscode.workspace.openTextDocument(indexUri);
    await vscode.window.showTextDocument(doc, { preview: false });

    vscode.window.showInformationMessage(`RICA analysis snapshot exported to ${path.join(root, '.rica', 'analysis-snapshot')}`);
}

async function writeJson(directory: vscode.Uri, fileName: string, value: unknown): Promise<void> {
    const json = `${JSON.stringify(value, null, 2)}\n`;
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(directory, fileName), Buffer.from(json, 'utf8'));
}

function safeSnapshotFileName(filePath: string): string {
    return filePath
        .replace(/^[A-Za-z]:/, '')
        .replace(/[\\/]+/g, '__')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/^_+/, '')
        .slice(0, 180) || 'unknown-file';
}

export function deactivate() {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}
