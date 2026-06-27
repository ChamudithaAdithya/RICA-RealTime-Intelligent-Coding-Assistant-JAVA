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
exports.VscodeSourceProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class VscodeSourceProvider {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    getWorkspaceRoot() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            throw new Error('No workspace folder open');
        }
        return folders[0].uri.fsPath;
    }
    async findJavaFiles(excludePatterns) {
        const excludeGlob = excludePatterns && excludePatterns.length > 0
            ? `{${excludePatterns.join(',')}}`
            : '**/node_modules/**';
        const javaFiles = await vscode.workspace.findFiles('**/*.java', excludeGlob);
        return javaFiles.map(f => f.fsPath);
    }
    async readFile(filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        return doc.getText();
    }
    async readAll() {
        const paths = await this.findJavaFiles();
        const results = [];
        for (const filePath of paths) {
            try {
                const content = await this.readFile(filePath);
                results.push({ uri: filePath, content });
                if (this.outputChannel) {
                    this.outputChannel.appendLine(`  ${path.basename(filePath)}`);
                }
            }
            catch (e) {
                if (this.outputChannel) {
                    this.outputChannel.appendLine(`  Failed to read ${filePath}: ${e.message}`);
                }
            }
        }
        return results;
    }
}
exports.VscodeSourceProvider = VscodeSourceProvider;
//# sourceMappingURL=vscodeSourceProvider.js.map