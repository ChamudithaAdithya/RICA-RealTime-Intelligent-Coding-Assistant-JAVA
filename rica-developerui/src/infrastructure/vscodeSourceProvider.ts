import * as vscode from 'vscode';
import * as path from 'path';
import { SourceProvider, SourceFile } from '../application/ports/sourceProvider';

export class VscodeSourceProvider implements SourceProvider {
  constructor(private readonly outputChannel?: vscode.OutputChannel) {}

  getWorkspaceRoot(): string {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      throw new Error('No workspace folder open');
    }
    return folders[0].uri.fsPath;
  }

  async findJavaFiles(excludePatterns?: string[]): Promise<string[]> {
    const excludeGlob = excludePatterns && excludePatterns.length > 0
      ? `{${excludePatterns.join(',')}}`
      : '**/node_modules/**';

    const javaFiles = await vscode.workspace.findFiles('**/*.java', excludeGlob);
    return javaFiles.map(f => f.fsPath);
  }

  async readFile(filePath: string): Promise<string> {
    const doc = await vscode.workspace.openTextDocument(filePath);
    return doc.getText();
  }

  async readAll(): Promise<SourceFile[]> {
    const paths = await this.findJavaFiles();
    const results: SourceFile[] = [];
    for (const filePath of paths) {
      try {
        const content = await this.readFile(filePath);
        results.push({ uri: filePath, content });
        if (this.outputChannel) {
          this.outputChannel.appendLine(`  ${path.basename(filePath)}`);
        }
      } catch (e: any) {
        if (this.outputChannel) {
          this.outputChannel.appendLine(`  Failed to read ${filePath}: ${e.message}`);
        }
      }
    }
    return results;
  }
}
