export interface SourceFile {
  uri: string;
  content: string;
}

export interface SourceProvider {
  getWorkspaceRoot(): string;
  findJavaFiles(excludePatterns?: string[]): Promise<string[]>;
  readFile(filePath: string): Promise<string>;
  readAll(): Promise<SourceFile[]>;
}
