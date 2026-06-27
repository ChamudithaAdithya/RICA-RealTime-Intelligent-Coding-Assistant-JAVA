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
exports.ASTManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class ASTManager {
    constructor(javaParser, apiClient, outputChannel, excludePatterns) {
        this.fileASTCache = new Map();
        this.javaParser = javaParser;
        this.apiClient = apiClient;
        this.outputChannel = outputChannel;
        this.excludePatterns = excludePatterns;
    }
    /**
     * Analyze the full project: find all Java files, parse them, send to backend.
     */
    async analyzeFullProject(workspaceFolder, progressCallback, token) {
        const startTime = Date.now();
        const errors = [];
        // Build exclude pattern
        const excludeGlob = this.excludePatterns.length > 0
            ? `{${this.excludePatterns.join(',')}}`
            : undefined;
        // Find all Java files
        const javaFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, '**/*.java'), excludeGlob);
        this.outputChannel.appendLine(`Found ${javaFiles.length} Java files`);
        if (javaFiles.length === 0) {
            return { fileCount: 0, nodeCount: 0, duration: Date.now() - startTime, errors: [] };
        }
        const files = {};
        let totalNodes = 0;
        // Parse each file
        for (let i = 0; i < javaFiles.length; i++) {
            if (token.isCancellationRequested) {
                break;
            }
            const fileUri = javaFiles[i];
            const relativePath = path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath);
            const fileName = path.basename(fileUri.fsPath);
            progressCallback(i + 1, javaFiles.length, fileName);
            try {
                const document = await vscode.workspace.openTextDocument(fileUri);
                const sourceCode = document.getText();
                const ast = this.javaParser.parse(sourceCode, relativePath);
                files[relativePath] = ast;
                this.fileASTCache.set(relativePath, ast);
                totalNodes += this.countNodes(ast);
            }
            catch (error) {
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
        }
        catch (error) {
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
    async analyzeFile(fileUri, content, changeType, oldUri) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return;
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
            }
            catch (error) {
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
            this.outputChannel.appendLine(`${changeType.toUpperCase()}: ${relativePath} sent to backend`);
        }
        catch (error) {
            this.outputChannel.appendLine(`Error processing ${changeType} for ${relativePath}: ${error.message}`);
        }
    }
    /**
     * Handle file deletion.
     */
    async handleFileDeleted(fileUri) {
        await this.analyzeFile(fileUri, '', 'deleted');
    }
    /**
     * Handle file rename.
     */
    async handleFileRenamed(oldUri, newUri) {
        try {
            const document = await vscode.workspace.openTextDocument(newUri);
            await this.analyzeFile(newUri, document.getText(), 'renamed', oldUri);
        }
        catch (error) {
            this.outputChannel.appendLine(`Error handling rename: ${error.message}`);
        }
    }
    getCachedAST(filePath) {
        return this.fileASTCache.get(filePath);
    }
    getCachedFileCount() {
        return this.fileASTCache.size;
    }
    getAllCachedASTs() {
        return Array.from(this.fileASTCache.values());
    }
    isExcluded(relativePath) {
        const normalizedPath = relativePath.replace(/\\/g, '/');
        for (const pattern of this.excludePatterns) {
            const cleaned = pattern.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, '');
            if (normalizedPath.includes(cleaned)) {
                return true;
            }
        }
        return false;
    }
    countNodes(node) {
        if (!node || typeof node !== 'object')
            return 0;
        let count = 1;
        if (Array.isArray(node)) {
            node.forEach(child => { count += this.countNodes(child); });
        }
        else {
            Object.values(node).forEach(value => {
                if (typeof value === 'object' && value !== null) {
                    count += this.countNodes(value);
                }
            });
        }
        return count;
    }
}
exports.ASTManager = ASTManager;
//# sourceMappingURL=astManager.js.map