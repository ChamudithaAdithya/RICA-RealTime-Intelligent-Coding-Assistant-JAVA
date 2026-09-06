import * as vscode from 'vscode';
import * as path from 'path';
import { ASTManager } from '../core/astManager';
import { ViolationManager } from '../core/violationManager';
import { SourceProvider } from '../application/ports/sourceProvider';

export class FileWatcher {
    private readonly astManager: ASTManager;
    private readonly violationManager: ViolationManager;
    private readonly sourceProvider: SourceProvider;
    private readonly outputChannel: vscode.OutputChannel;
    private readonly debounceDelay: number;
    private readonly debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor(
        astManager: ASTManager,
        violationManager: ViolationManager,
        sourceProvider: SourceProvider,
        outputChannel: vscode.OutputChannel,
        debounceDelay: number
    ) {
        this.astManager = astManager;
        this.violationManager = violationManager;
        this.sourceProvider = sourceProvider;
        this.outputChannel = outputChannel;
        this.debounceDelay = debounceDelay;
    }

    /**
     * Start watching for file system events on .java files.
     */
    start(context: vscode.ExtensionContext): void {
        // Watch for file creation
        const createWatcher = vscode.workspace.createFileSystemWatcher('**/*.java');

        createWatcher.onDidCreate(async (uri) => {
            this.outputChannel.appendLine(`File created: ${uri.fsPath}`);
            await this.handleFileEvent(uri, 'created');
        });

        createWatcher.onDidChange(async (uri) => {
            // File changed on disk (e.g., external edit or git operations)
            this.debouncedHandleFileEvent(uri, 'changed');
        });

        createWatcher.onDidDelete(async (uri) => {
            this.outputChannel.appendLine(`File deleted: ${uri.fsPath}`);
            await this.astManager.handleFileDeleted(uri.fsPath);
            const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
            this.violationManager.onFileDeleted(path.relative(workspaceRoot, uri.fsPath));
        });

        this.disposables.push(createWatcher);
        context.subscriptions.push(createWatcher);

        // Watch for file renames
        const renameDisposable = vscode.workspace.onDidRenameFiles(async (event) => {
            for (const file of event.files) {
                if (file.newUri.fsPath.endsWith('.java') || file.oldUri.fsPath.endsWith('.java')) {
                    this.outputChannel.appendLine(`File renamed: ${file.oldUri.fsPath} → ${file.newUri.fsPath}`);

                    if (file.newUri.fsPath.endsWith('.java')) {
                        const document = await vscode.workspace.openTextDocument(file.newUri);
                        await this.astManager.handleFileRenamed(
                            file.newUri.fsPath,
                            document.getText(),
                            file.oldUri.fsPath
                        );
                        const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
                        this.violationManager.onFileDeleted(path.relative(workspaceRoot, file.oldUri.fsPath));
                        this.violationManager.onFileSaved(
                            path.relative(workspaceRoot, file.newUri.fsPath),
                            document.getText()
                        );
                    } else {
                        // Renamed away from .java
                        await this.astManager.handleFileDeleted(file.oldUri.fsPath);
                        const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
                        this.violationManager.onFileDeleted(path.relative(workspaceRoot, file.oldUri.fsPath));
                    }
                }
            }
        });

        this.disposables.push(renameDisposable);
        context.subscriptions.push(renameDisposable);

        this.outputChannel.appendLine('File watcher started');
    }

    /**
     * Called when a document is edited in the editor (before save).
     * Uses debouncing to avoid excessive parsing.
     */
    onDocumentChanged(document: vscode.TextDocument): void {
        const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
        const relativePath = path.relative(workspaceRoot, document.uri.fsPath);
        this.violationManager.markFileDirty(relativePath);
        this.debouncedHandleDocumentChange(document);
    }

    /**
     * Called when a document is saved.
     * Immediately parses and sends.
     */
    async onDocumentSaved(document: vscode.TextDocument): Promise<void> {
        // Cancel any pending debounced change for this file
        const key = document.uri.fsPath;
        const existing = this.debounceTimers.get(key);
        if (existing) {
            clearTimeout(existing);
            this.debounceTimers.delete(key);
        }

        this.outputChannel.appendLine(`File saved: ${document.uri.fsPath}`);

        // Compute relative path from workspace root
        const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
        const relativePath = path.relative(workspaceRoot, document.uri.fsPath);

        // Phase 5: Use delta pipeline instead of full rebuild
        await this.astManager.analyzeFile(document.uri.fsPath, document.getText(), 'changed');
        this.violationManager.onFileSaved(relativePath, document.getText());
    }

    dispose(): void {
        // Clear all timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        // Dispose watchers
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
    }

    private debouncedHandleFileEvent(uri: vscode.Uri, changeType: 'created' | 'changed'): void {
        const key = uri.fsPath;
        const existing = this.debounceTimers.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        const timer = setTimeout(async () => {
            this.debounceTimers.delete(key);
            await this.handleFileEvent(uri, changeType);
        }, this.debounceDelay);

        this.debounceTimers.set(key, timer);
    }

    private debouncedHandleDocumentChange(document: vscode.TextDocument): void {
        const key = document.uri.fsPath;
        const existing = this.debounceTimers.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        const timer = setTimeout(async () => {
            this.debounceTimers.delete(key);
            try {
                // Phase 6: During editing, run a debounced local parse (not full rebuild)
                // This gives the developer fast syntax-level feedback while typing
                const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
                const relativePath = path.relative(workspaceRoot, document.uri.fsPath);

                await this.astManager.analyzeFile(
                    document.uri.fsPath,
                    document.getText(),
                    'changed'
                );
                // Use delta pipeline for edit events too — faster than full rebuild
                this.violationManager.onFileSaved(relativePath, document.getText());
            } catch (error: any) {
                this.outputChannel.appendLine(`Debounced change error: ${error.message}`);
            }
        }, 350); // Fixed 350ms debounce for edit events

        this.debounceTimers.set(key, timer);
    }

    private async handleFileEvent(uri: vscode.Uri, changeType: 'created' | 'changed'): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            await this.astManager.analyzeFile(uri.fsPath, document.getText(), changeType);

            const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
            const relativePath = path.relative(workspaceRoot, uri.fsPath);

            this.violationManager.onFileSaved(relativePath, document.getText());
        } catch (error: any) {
            this.outputChannel.appendLine(`Error handling ${changeType} event for ${uri.fsPath}: ${error.message}`);
        }
    }
}
