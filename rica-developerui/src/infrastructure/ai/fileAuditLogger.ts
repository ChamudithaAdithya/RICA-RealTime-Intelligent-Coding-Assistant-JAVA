import * as fs from 'fs';
import * as path from 'path';
import { AiAuditLogEntry } from '../../domain/ai';
import { AiAuditLogger } from '../../application/ports/aiAuditLogger';
import { ensureRicaWorkspaceGitignoreSync } from '../ricaWorkspaceArtifacts';

export class FileAuditLogger implements AiAuditLogger {
  constructor(private readonly workspaceRoot: string) {}

  log(entry: AiAuditLogEntry): void {
    try {
      const dir = path.join(this.workspaceRoot, '.rica');
      ensureRicaWorkspaceGitignoreSync(this.workspaceRoot);
      fs.appendFileSync(path.join(dir, 'ai-audit.jsonl'), JSON.stringify(entry) + '\n', 'utf8');
    } catch {
      // Audit logging must never break or throw into the analysis pipeline.
    }
  }
}
