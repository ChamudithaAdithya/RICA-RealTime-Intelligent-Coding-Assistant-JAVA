export interface BackendService {
  checkHealth(): Promise<boolean>;
  sendFullAST(projectName: string, workspacePath: string, files: Record<string, any>): Promise<any>;
  sendFileChange(changeType: 'created' | 'changed' | 'deleted' | 'renamed', filePath: string, ast: any | null, oldFilePath?: string): Promise<any>;
  resetBackend(): Promise<any>;
  getFileAST(filePath: string): Promise<any>;
  getFiles(): Promise<any>;
  getStats(): Promise<any>;
  getHistory(limit?: number): Promise<any>;
}
