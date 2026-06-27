import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export class ApiClient {
    private baseUrl: string;
    private outputChannel: vscode.OutputChannel;

    constructor(baseUrl: string, outputChannel: vscode.OutputChannel) {
        this.baseUrl = baseUrl;
        this.outputChannel = outputChannel;
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await this.get('/health');
            return response?.status === 'ok';
        } catch (error) {
            this.outputChannel.appendLine(`Health check failed: ${error}`);
            return false;
        }
    }

    async sendFullAST(projectName: string, workspacePath: string, files: Record<string, any>): Promise<any> {
        this.outputChannel.appendLine(`Sending full AST: ${Object.keys(files).length} files`);

        return this.post('/ast/full', {
            projectName,
            workspacePath,
            files,
            timestamp: Date.now()
        });
    }

    async sendFileChange(
        changeType: 'created' | 'changed' | 'deleted' | 'renamed',
        filePath: string,
        ast: any | null,
        oldFilePath?: string
    ): Promise<any> {
        this.outputChannel.appendLine(`Sending change: ${changeType} ${filePath}`);

        return this.post('/ast/change', {
            changeType,
            filePath,
            ast,
            oldFilePath,
            timestamp: Date.now()
        });
    }

    async resetBackend(): Promise<any> {
        return this.post('/ast/reset', {});
    }

    async getFileAST(filePath: string): Promise<any> {
        return this.get(`/ast/file?path=${encodeURIComponent(filePath)}`);
    }

    async getStats(): Promise<any> {
        return this.get('/ast/stats');
    }

    async getFiles(): Promise<any> {
        return this.get('/ast/files');
    }

    async getHistory(limit: number = 50): Promise<any> {
        return this.get(`/ast/history?limit=${limit}`);
    }

    private async get(path: string): Promise<any> {
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
                    } catch {
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

    private async post(path: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const fullUrl = this.baseUrl + path;
            const parsed = new url.URL(fullUrl);
            const jsonBody = JSON.stringify(body);

            const client = parsed.protocol === 'https:' ? https : http;

            const options: http.RequestOptions = {
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
                    } catch {
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