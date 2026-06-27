import * as path from 'path';
import { JavaParser } from './infrastructure/javaParser';
import { BackendService } from './application/ports/backendService';
import { SourceProvider } from './application/ports/sourceProvider';

export interface AnalysisResult {
    fileCount: number;
    nodeCount: number;
    duration: number;
    errors: string[];
}

export interface ProgressCallback {
    (current: number, total: number, fileName: string): void;
}

export interface CancellationToken {
    isCancellationRequested: boolean;
}

export class ASTManager {
    private javaParser: JavaParser;
    private backendService: BackendService;
    private sourceProvider: SourceProvider;
    private outputChannel: { appendLine(message: string): void };
    private excludePatterns: string[];
    private fileASTCache: Map<string, any> = new Map();

    constructor(
        javaParser: JavaParser,
        backendService: BackendService,
        sourceProvider: SourceProvider,
        outputChannel: { appendLine(message: string): void },
        excludePatterns: string[]
    ) {
        this.javaParser = javaParser;
        this.backendService = backendService;
        this.sourceProvider = sourceProvider;
        this.outputChannel = outputChannel;
        this.excludePatterns = excludePatterns;
    }

    /**
     * Analyze the full project: find all Java files, parse them, send to backend.
     */
    async analyzeFullProject(
        workspaceRoot: string,
        projectName: string,
        progressCallback?: ProgressCallback,
        token?: CancellationToken
    ): Promise<AnalysisResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        // Find all Java files
        const javaFiles = await this.sourceProvider.findJavaFiles(this.excludePatterns);

        this.outputChannel.appendLine(`Found ${javaFiles.length} Java files`);

        if (javaFiles.length === 0) {
            return { fileCount: 0, nodeCount: 0, duration: Date.now() - startTime, errors: [] };
        }

        const files: Record<string, any> = {};
        let totalNodes = 0;

        // Parse each file
        for (let i = 0; i < javaFiles.length; i++) {
            if (token?.isCancellationRequested) {
                break;
            }

            const fsPath = javaFiles[i];
            const relativePath = path.relative(workspaceRoot, fsPath);
            const fileName = path.basename(fsPath);

            if (progressCallback) {
                progressCallback(i + 1, javaFiles.length, fileName);
            }

            try {
                const sourceCode = await this.sourceProvider.readFile(fsPath);
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
        try {
            await this.backendService.sendFullAST(projectName, workspaceRoot, files);
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
        filePath: string,
        content: string,
        changeType: 'created' | 'changed' | 'deleted' | 'renamed',
        oldFilePath?: string
    ): Promise<void> {
        const workspaceRoot = this.sourceProvider.getWorkspaceRoot();
        const relativePath = path.relative(workspaceRoot, filePath);

        // Check if excluded
        if (this.isExcluded(relativePath)) {
            return;
        }

        if (changeType === 'deleted') {
            this.fileASTCache.delete(relativePath);
            try {
                await this.backendService.sendFileChange('deleted', relativePath, null);
            } catch (error: any) {
                this.outputChannel.appendLine(`Failed to send delete: ${error.message}`);
            }
            return;
        }

        try {
            const ast = this.javaParser.parse(content, relativePath);
            this.fileASTCache.set(relativePath, ast);

            const oldRelPath = oldFilePath
                ? path.relative(workspaceRoot, oldFilePath)
                : undefined;

            await this.backendService.sendFileChange(changeType, relativePath, ast, oldRelPath);

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
    async handleFileDeleted(filePath: string): Promise<void> {
        await this.analyzeFile(filePath, '', 'deleted');
    }

    /**
     * Handle file rename.
     */
    async handleFileRenamed(newFilePath: string, content: string, oldFilePath: string): Promise<void> {
        try {
            await this.analyzeFile(newFilePath, content, 'renamed', oldFilePath);
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
