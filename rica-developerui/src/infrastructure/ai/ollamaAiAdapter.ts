import { AiContextPayload, AiDecision } from '../../domain/ai';
import { AiDecisionProvider } from '../../application/ports/aiDecisionProvider';
import { httpRequest } from './httpJson';
import { buildMessages } from './prompt';
import { parseDecisions } from './parseDecisions';

export interface OllamaAdapterOptions {
  timeoutMs: number;
  maxTokensPerRequest: number;
}

export class OllamaAiAdapter implements AiDecisionProvider {
  constructor(
    private readonly endpoint: string,
    private readonly model: string,
    private readonly options: OllamaAdapterOptions,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await httpRequest(`${this.stripSlash(this.endpoint)}/api/tags`, {
        method: 'GET',
        timeoutMs: this.options.timeoutMs,
      });
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    }
  }

  /** Forces the model weights into VRAM with a tiny prompt; keeps the response small. */
  async warmUp(opts: { timeoutMs: number; numPredict: number }): Promise<void> {
    const body = {
      model: this.model,
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      stream: true,
      format: 'json',
      keep_alive: '30m',
      options: { num_predict: opts.numPredict, temperature: 0 },
    };
    const res = await httpRequest(`${this.stripSlash(this.endpoint)}/api/chat`, {
      body,
      timeoutMs: opts.timeoutMs,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Warm-up returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
    }
  }

  async evaluate(context: AiContextPayload): Promise<AiDecision[]> {
    const base = this.stripSlash(this.endpoint);
    const body = {
      model: this.model,
      messages: buildMessages(context),
      stream: true,
      format: 'json',
      keep_alive: '30m',
      options: { num_predict: this.options.maxTokensPerRequest, temperature: 0.2 },
    };
    const res = await httpRequest(`${base}/api/chat`, {
      body,
      timeoutMs: this.options.timeoutMs,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Ollama returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
    }
    return parseDecisions(extractOllamaContent(res.body));
  }

  private stripSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }
}

/**
 * Streaming responses are NDJSON: one object per line {...,"message":{"content":...},"done":false}.
 * Accumulate the content deltas. Falls back to a single JSON object for layered gateways
 * (e.g. tunnels/proxies) that buffer the stream into one non-streamed reply.
 */
function extractOllamaContent(body: string): string {
  const lines = body.split(/\r?\n/).filter(l => l.trim());
  if (lines.length > 1) {
    let content = '';
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        content += chunk.message?.content ?? '';
        if (chunk.done) break;
      } catch {
        // Non-JSON line — ignore (blank keepalives etc.).
      }
    }
    if (content) return content;
  }
  try {
    const json = JSON.parse(body) as { message?: { content?: string } };
    return json.message?.content ?? '';
  } catch {
    return '';
  }
}