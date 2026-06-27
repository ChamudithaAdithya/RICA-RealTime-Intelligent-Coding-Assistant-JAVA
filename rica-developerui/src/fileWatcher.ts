import * as vscode from 'vscode';
import { ASTManager } from './astManager';
import { ViolationManager } from './violationManager';

export class FileWatcher {
    private readonly astManager: ASTManager;
    private readonly violationManager: ViolationManager;
    private readonly outputChannel: vscode.OutputChannel;
    private readonly debounceDelay: number;
    private readonly debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor(
        astManager: ASTManager,
        violationManager: ViolationManager,
        outputChannel: vscode.OutputChannel,
        debounceDelay: number
    ) {
        this.astManager = astManager;
        this.violationManager = violationManager;
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
            await this.astManager.handleFileDeleted(uri);
        });

        this.disposables.push(createWatcher);
        context.subscriptions.push(createWatcher);

        // Watch for file renames
        const renameDisposable = vscode.workspace.onDidRenameFiles(async (event) => {
            for (const file of event.files) {
                if (file.newUri.fsPath.endsWith('.java') || file.oldUri.fsPath.endsWith('.java')) {
                    this.outputChannel.appendLine(`File renamed: ${file.oldUri.fsPath} → ${file.newUri.fsPath}`);

                    if (file.newUri.fsPath.endsWith('.java')) {
                        await this.astManager.handleFileRenamed(file.oldUri, file.newUri);
                    } else {
                        // Renamed away from .java
                        await this.astManager.handleFileDeleted(file.oldUri);
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
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;
        const relativePath = require('path').relative(workspaceFolders[0].uri.fsPath, document.uri.fsPath);

        // Phase 5: Use delta pipeline instead of full rebuild
        await this.astManager.analyzeFile(document.uri, document.getText(), 'changed');
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
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) return;
                const relativePath = require('path').relative(workspaceFolders[0].uri.fsPath, document.uri.fsPath);

                await this.astManager.analyzeFile(
                    document.uri,
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
            await this.astManager.analyzeFile(document.uri, document.getText(), changeType);

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) return;
            const relativePath = require('path').relative(workspaceFolders[0].uri.fsPath, document.uri.fsPath);

            this.violationManager.onFileSaved(relativePath, document.getText());
        } catch (error: any) {
            this.outputChannel.appendLine(`Error handling ${changeType} event for ${uri.fsPath}: ${error.message}`);
        }
    }
}