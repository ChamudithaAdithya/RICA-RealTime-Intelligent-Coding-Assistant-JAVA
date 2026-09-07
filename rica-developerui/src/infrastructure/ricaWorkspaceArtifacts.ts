import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const RICA_GITIGNORE = [
  '*',
  '!.gitignore',
  '',
].join('\n');

export async function ensureRicaWorkspaceGitignore(workspaceRoot: string): Promise<void> {
  const ricaRoot = vscode.Uri.file(path.join(workspaceRoot, '.rica'));
  await vscode.workspace.fs.createDirectory(ricaRoot);
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(ricaRoot, '.gitignore'),
    Buffer.from(RICA_GITIGNORE, 'utf8'),
  );
}

export function ensureRicaWorkspaceGitignoreSync(workspaceRoot: string): void {
  const ricaRoot = path.join(workspaceRoot, '.rica');
  fs.mkdirSync(ricaRoot, { recursive: true });
  fs.writeFileSync(path.join(ricaRoot, '.gitignore'), RICA_GITIGNORE, 'utf8');
}
