import { AiAuditLogEntry } from '../../domain/ai';

export interface AiAuditLogger {
  /** Append one reasoning run to persistent storage. Failures must never throw. */
  log(entry: AiAuditLogEntry): void;
}