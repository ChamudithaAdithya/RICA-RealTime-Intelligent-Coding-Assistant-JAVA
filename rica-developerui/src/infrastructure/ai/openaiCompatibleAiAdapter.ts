import { AiContextPayload, AiDecision } from '../../domain/ai';
import { AiDecisionProvider } from '../../application/ports/aiDecisionProvider';
import { httpRequest } from './httpJson';
import { buildMessages } from './prompt';
import { parseDecisions } from './parseDecisions';

export interface OpenAiCompatibleAdapterOptions {
  timeoutMs: number;
  maxTokensPerRequest: number;
  /** Optional Bearer token (e.g. for hosted endpoints) */
  apiKey?: string;
}

export class OpenAICompatibleAiAdapter implements AiDecisionProvider {
  constructor(
    private readonly endpoint: string,
    private readonly model: string,
    private readonly options: OpenAiCompatibleAdapterOptions,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await httpRequest(`${this.stripSlash(this.endpoint)}/models`, {
        method: 'GET',
        timeoutMs: this.options.timeoutMs,
        headers: this.authHeaders(),
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
      temperature: 0.2,
      max_tokens: this.options.maxTokensPerRequest,
      response_format: { type: 'json_object' },
    };
    const res = await httpRequest(`${base}/v1/chat/completions`, {
      body,
      timeoutMs: this.options.timeoutMs,
      headers: this.authHeaders(),
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Provider returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
    }
    const json = JSON.parse(res.body) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('Provider response had no message content');
    return parseDecisions(content);
  }

  private authHeaders(): Record<string, string> | undefined {
    return this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : undefined;
  }

  private stripSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }
}