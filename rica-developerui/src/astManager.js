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
const path = __importStar(require("path"));
class ASTManager {
    constructor(javaParser, backendService, sourceProvider, outputChannel, excludePatterns) {
        this.fileASTCache = new Map();
        this.javaParser = javaParser;
        this.backendService = backendService;
        this.sourceProvider = sourceProvider;
        this.outputChannel = outputChannel;
        this.excludePatterns = excludePatterns;
    }
    /**
     * Analyze the full project: find all Java files, parse them, send to backend.
     */
    async analyzeFullProject(workspaceRoot, projectName, progressCallback, token) {
        const startTime = Date.now();
        const errors = [];
        // A full scan is authoritative. Remove entries from prior scans so
        // deleted or newly excluded files cannot be reintroduced from cache.
        this.fileASTCache.clear();
        // Find all Java files
        const javaFiles = await this.sourceProvider.findJavaFiles(this.excludePatterns);
        this.outputChannel.appendLine(`Found ${javaFiles.length} Java files`);
        if (javaFiles.length === 0) {
            return { fileCount: 0, nodeCount: 0, duration: Date.now() - startTime, errors: [] };
        }
        const files = {};
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
        try {
            await this.backendService.sendFullAST(projectName, workspaceRoot, files);
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
    async analyzeFile(filePath, content, changeType, oldFilePath) {
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
            }
            catch (error) {
                this.outputChannel.appendLine(`Failed to send delete: ${error.message}`);
            }
            return;
        }
        const oldRelPath = oldFilePath
            ? path.relative(workspaceRoot, oldFilePath)
            : undefined;
        if (changeType === 'renamed' && oldRelPath) {
            this.fileASTCache.delete(oldRelPath);
        }
        try {
            const ast = this.javaParser.parse(content, relativePath);
            this.fileASTCache.set(relativePath, ast);
            await this.backendService.sendFileChange(changeType, relativePath, ast, oldRelPath);
            this.outputChannel.appendLine(`${changeType.toUpperCase()}: ${relativePath} sent to backend`);
        }
        catch (error) {
            this.outputChannel.appendLine(`Error processing ${changeType} for ${relativePath}: ${error.message}`);
        }
    }
    /**
     * Handle file deletion.
     */
    async handleFileDeleted(filePath) {
        await this.analyzeFile(filePath, '', 'deleted');
    }
    /**
     * Handle file rename.
     */
    async handleFileRenamed(newFilePath, content, oldFilePath) {
        try {
            await this.analyzeFile(newFilePath, content, 'renamed', oldFilePath);
        }
        catch (error) {
            this.outputChannel.appendLine(`Error handling rename: ${error.message}`);
        }
    }
    setExcludePatterns(excludePatterns) {
        this.excludePatterns = [...excludePatterns];
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