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

  async evaluate(context: AiContextPayload): Promise<AiDecision[]> {
    const base = this.stripSlash(this.endpoint);
    const body = {
      model: this.model,
      messages: buildMessages(context),
      stream: false,
      format: 'json',
      options: { num_predict: this.options.maxTokensPerRequest, temperature: 0.2 },
    };
    const res = await httpRequest(`${base}/api/chat`, {
      body,
      timeoutMs: this.options.timeoutMs,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Ollama returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
    }
    const json = JSON.parse(res.body) as { message?: { content?: string } };
    const content = json.message?.content;
    if (!content) throw new Error('Ollama response had no message content');
    return parseDecisions(content);
  }

  private stripSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }
}