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
exports.ApiClient = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url = __importStar(require("url"));
class ApiClient {
    constructor(baseUrl, outputChannel) {
        this.baseUrl = baseUrl;
        this.outputChannel = outputChannel;
    }
    async checkHealth() {
        try {
            const response = await this.get('/health');
            return response?.status === 'ok';
        }
        catch (error) {
            this.outputChannel.appendLine(`Health check failed: ${error}`);
            return false;
        }
    }
    async sendFullAST(projectName, workspacePath, files) {
        this.outputChannel.appendLine(`Sending full AST: ${Object.keys(files).length} files`);
        return this.post('/ast/full', {
            projectName,
            workspacePath,
            files,
            timestamp: Date.now()
        });
    }
    async sendFileChange(changeType, filePath, ast, oldFilePath) {
        this.outputChannel.appendLine(`Sending change: ${changeType} ${filePath}`);
        return this.post('/ast/change', {
            changeType,
            filePath,
            ast,
            oldFilePath,
            timestamp: Date.now()
        });
    }
    async resetBackend() {
        return this.post('/ast/reset', {});
    }
    async getFileAST(filePath) {
        return this.get(`/ast/file?path=${encodeURIComponent(filePath)}`);
    }
    async getStats() {
        return this.get('/ast/stats');
    }
    async getFiles() {
        return this.get('/ast/files');
    }
    async getHistory(limit = 50) {
        return this.get(`/ast/history?limit=${limit}`);
    }
    async get(path) {
        return new Promise((resolve, reject) => {
            const fullUrl = this.baseUrl + path;
            const parsed = new url.URL(fullUrl);
            const client = parsed.protocol === 'https:' ? https : http;
            const req = client.get(fullUrl, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        resolve(data);
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }
    async post(path, body) {
        return new Promise((resolve, reject) => {
            const fullUrl = this.baseUrl + path;
            const parsed = new url.URL(fullUrl);
            const jsonBody = JSON.stringify(body);
            const client = parsed.protocol === 'https:' ? https : http;
            const options = {
                method: 'POST',
                hostname: parsed.hostname,
                port: parsed.port,
                path: parsed.pathname,
                timeout: 60000,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(jsonBody)
                }
            };
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        resolve(data);
                    }
                });
            });
            req.on('error', (error) => {
                this.outputChannel.appendLine(`API request error for ${path}: ${error.message}`);
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.write(jsonBody);
            req.end();
        });
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=apiClient.js.map