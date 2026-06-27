import * as vscode from 'vscode';
import * as path from 'path';
import { JavaParser } from './javaParser';
import { ApiClient } from './apiClient';

export interface AnalysisResult {
    fileCount: number;
    nodeCount: number;
    duration: number;
    errors: string[];
}

export class ASTManager {
    private javaParser: JavaParser;
    private apiClient: ApiClient;
    private outputChannel: vscode.OutputChannel;
    private excludePatterns: string[];
    private fileASTCache: Map<string, any> = new Map();

    constructor(
        javaParser: JavaParser,
        apiClient: ApiClient,
        outputChannel: vscode.OutputChannel,
        excludePatterns: string[]
    ) {
        this.javaParser = javaParser;
        this.apiClient = apiClient;
        this.outputChannel = outputChannel;
        this.excludePatterns = excludePatterns;
    }

    /**
     * Analyze the full project: find all Java files, parse them, send to backend.
     */
    async analyzeFullProject(
        workspaceFolder: vscode.WorkspaceFolder,
        progressCallback: (current: number, total: number, fileName: string) => void,
        token: vscode.CancellationToken
    ): Promise<AnalysisResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        // Build exclude pattern
        const excludeGlob = this.excludePatterns.length > 0
            ? `{${this.excludePatterns.join(',')}}`
            : undefined;

        // Find all Java files
        const javaFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(workspaceFolder, '**/*.java'),
            excludeGlob
        );

        this.outputChannel.appendLine(`Found ${javaFiles.length} Java files`);

        if (javaFiles.length === 0) {
            return { fileCount: 0, nodeCount: 0, duration: Date.now() - startTime, errors: [] };
        }

        const files: Record<string, any> = {};
        let totalNodes = 0;

        // Parse each file
        for (let i = 0; i < javaFiles.length; i++) {
            if (token.isCancellationRequested) {
                break;
            }

            const fileUri = javaFiles[i];
            const relativePath = path.relative(
                workspaceFolder.uri.fsPath,
                fileUri.fsPath
            );
            const fileName = path.basename(fileUri.fsPath);

            progressCallback(i + 1, javaFiles.length, fileName);

            try {
                const document = await vscode.workspace.openTextDocument(fileUri);
                const sourceCode = document.getText();

                const ast = this.javaParser.parse(sourceCode, relativePath);
                files[relativePath] = ast;
                this.fileASTCache.set(relativePath, ast);
                totalNodes += this.countNodes(ast);
            } catch (error: any) {
                const errorMsg = `Failed to parse ${relativePath}: ${error.message}`;
                this.outputChannel.appendLine(errorMsg);
                errors.push(errorMsg);

                // Still store an error node
                files[relativePath] = {
                    type: 'CompilationUnit',
                    filePath: relativePath,
                    error: true,
                    errorMessage: error.message
                };
            }
        }

        // Send to backend
        const projectName = workspaceFolder.name;
        const workspacePath = workspaceFolder.uri.fsPath;

        try {
            await this.apiClient.sendFullAST(projectName, workspacePath, files);
            this.outputChannel.appendLine(`Full AST sent to backend: ${Object.keys(files).length} files`);
        } catch (error: any) {
            const errorMsg = `Failed to send AST to backend: ${error.message}`;
            this.outputChannel.appendLine(errorMsg);
            errors.push(errorMsg);
        }

        const duration = Date.now() - startTime;
        this.outputChannel.appendLine(`Analysis complete: ${Object.keys(files).length} files, ${totalNodes} nodes, ${duration}ms`);

        return {
            fileCount: Object.keys(files).length,
            nodeCount: totalNodes,
            duration,
            errors
        };
    }

    /**
     * Analyze a single file and send the change to backend.
     */
    async analyzeFile(
        fileUri: vscode.Uri,
        content: string,
        changeType: 'created' | 'changed' | 'deleted' | 'renamed',
        oldUri?: vscode.Uri
    ): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const relativePath = path.relative(workspaceRoot, fileUri.fsPath);

        // Check if excluded
        if (this.isExcluded(relativePath)) {
            return;
        }

        if (changeType === 'deleted') {
            this.fileASTCache.delete(relativePath);
            try {
                await this.apiClient.sendFileChange('deleted', relativePath, null);
            } catch (error: any) {
                this.outputChannel.appendLine(`Failed to send delete: ${error.message}`);
            }
            return;
        }

        try {
            const ast = this.javaParser.parse(content, relativePath);
            this.fileASTCache.set(relativePath, ast);

            const oldRelativePath = oldUri
                ? path.relative(workspaceRoot, oldUri.fsPath)
                : undefined;

            await this.apiClient.sendFileChange(changeType, relativePath, ast, oldRelativePath);

            this.outputChannel.appendLine(
                `${changeType.toUpperCase()}: ${relativePath} sent to backend`
            );
        } catch (error: any) {
            this.outputChannel.appendLine(`Error processing ${changeType} for ${relativePath}: ${error.message}`);
        }
    }

    /**
     * Handle file deletion.
     */
    async handleFileDeleted(fileUri: vscode.Uri): Promise<void> {
        await this.analyzeFile(fileUri, '', 'deleted');
    }

    /**
     * Handle file rename.
     */
    async handleFileRenamed(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(newUri);
            await this.analyzeFile(newUri, document.getText(), 'renamed', oldUri);
        } catch (error: any) {
            this.outputChannel.appendLine(`Error handling rename: ${error.message}`);
        }
    }

    getCachedAST(filePath: string): any | undefined {
        return this.fileASTCache.get(filePath);
    }

    getCachedFileCount(): number {
        return this.fileASTCache.size;
    }

    getAllCachedASTs(): any[] {
        return Array.from(this.fileASTCache.values());
    }

    private isExcluded(relativePath: string): boolean {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        for (const pattern of this.excludePatterns) {
            const cleaned = pattern.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, '');
            if (normalizedPath.includes(cleaned)) {
                return true;
            }
        }
        return false;
    }

    private countNodes(node: any): number {
        if (!node || typeof node !== 'object') return 0;
        let count = 1;
        if (Array.isArray(node)) {
            node.forEach(child => { count += this.countNodes(child); });
        } else {
            Object.values(node).forEach(value => {
                if (typeof value === 'object' && value !== null) {
                    count += this.countNodes(value);
                }
            });
        }
        return count;
    }
}