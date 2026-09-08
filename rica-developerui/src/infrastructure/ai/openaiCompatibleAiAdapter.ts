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

const RICA_DECISIONS_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'rica_advisory_decisions',
    description: 'RICA architectural advisory decisions for the supplied candidates.',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['decisions'],
      properties: {
        decisions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['violationId', 'verdict', 'confidence', 'reasoning', 'findings', 'ambiguityResolution'],
            properties: {
              violationId: { type: 'string' },
              verdict: { type: 'string', enum: ['VIOLATION', 'NO_VIOLATION', 'AMBIGUOUS'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reasoning: { type: 'string' },
              findings: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['kind', 'message', 'code', 'strength', 'quickFix'],
                  properties: {
                    kind: {
                      type: 'string',
                      enum: ['missingAuthorizationCheck', 'missingValidation', 'unhandledCondition', 'misplacedLogic', 'other'],
                    },
                    message: { type: 'string' },
                    code: { type: 'string' },
                    strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                    quickFix: {
                      anyOf: [
                        {
                          type: 'object',
                          additionalProperties: false,
                          required: ['title', 'description', 'edits'],
                          properties: {
                            title: { type: 'string' },
                            description: { type: 'string' },
                            edits: {
                              type: 'array',
                              items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['filePath', 'line', 'kind', 'text'],
                                properties: {
                                  filePath: { type: 'string' },
                                  line: { type: 'integer', minimum: 1 },
                                  kind: { type: 'string', enum: ['insertBefore', 'insertAfter', 'replace'] },
                                  text: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                        { type: 'null' },
                      ],
                    },
                  },
                },
              },
              ambiguityResolution: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['directive', 'rationale'],
                    properties: {
                      directive: { type: 'string', enum: ['dismiss', 'review', 'confirm'] },
                      rationale: { type: 'string' },
                    },
                  },
                  { type: 'null' },
                ],
              },
            },
          },
        },
      },
    },
  },
} as const;

interface ChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null; refusal?: string | null };
  }>;
}

export class OpenAICompatibleAiAdapter implements AiDecisionProvider {
  constructor(
    private readonly endpoint: string,
    private readonly model: string,
    private readonly options: OpenAiCompatibleAdapterOptions,
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await httpRequest(`${this.apiBase()}/models`, {
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
    return this.evaluateContext(context);
  }

  private async evaluateContext(context: AiContextPayload): Promise<AiDecision[]> {
    const baseBody = {
      model: this.model,
      messages: buildMessages(context),
      temperature: 0.2,
      max_tokens: this.options.maxTokensPerRequest,
    };
    let res = await this.chatCompletion({
      ...baseBody,
      response_format: RICA_DECISIONS_RESPONSE_FORMAT,
    });

    // Other OpenAI-compatible servers may support only legacy JSON mode, or
    // may not implement response_format at all. Preserve compatibility while
    // using strict Structured Outputs on OpenAI and capable providers.
    if (this.isResponseFormatUnsupported(res.status, res.body)) {
      res = await this.chatCompletion({
        ...baseBody,
        response_format: { type: 'json_object' },
      });
      if (this.isResponseFormatUnsupported(res.status, res.body)) {
        res = await this.chatCompletion(baseBody);
      }
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Provider returned HTTP ${res.status}: ${res.body.slice(0, 200)}`);
    }

    let json: ChatCompletionResponse;
    try {
      json = JSON.parse(res.body) as ChatCompletionResponse;
    } catch (error) {
      throw new Error(`Provider response was not valid JSON: ${(error as Error).message}`);
    }
    const choice = json.choices?.[0];
    const refusal = choice?.message?.refusal;
    if (refusal) {
      throw new Error(`Provider refused the AI review: ${refusal}`);
    }

    const content = choice?.message?.content;
    if (!content) {
      throw new Error('Provider response had no message content');
    }

    try {
      if (choice?.finish_reason === 'length') {
        throw new Error('AI response reached the configured output-token limit');
      }
      return parseDecisions(content);
    } catch (error) {
      // A long multi-candidate answer can be cut in the middle of a JSON
      // string. Retry as smaller batches so each response fits the same user-
      // configured limit instead of discarding the complete review.
      if (context.candidates.length > 1) {
        const midpoint = Math.ceil(context.candidates.length / 2);
        const left = { ...context, candidates: context.candidates.slice(0, midpoint) };
        const right = { ...context, candidates: context.candidates.slice(midpoint) };
        // Keep retries sequential to avoid turning one truncated response into
        // a burst of parallel calls against the provider's rate limit.
        const leftDecisions = await this.evaluateContext(left);
        const rightDecisions = await this.evaluateContext(right);
        return [...leftDecisions, ...rightDecisions];
      }
      const detail = (error as Error).message;
      throw new Error(`${detail}. Increase javaAstAnalyzer.aiMaxTokensPerRequest if this candidate needs a longer answer.`);
    }
  }

  private isResponseFormatUnsupported(status: number, body: string): boolean {
    return (status === 400 || status === 422)
      && /response[_ -]?format|json[_ -]?schema|structured output|schema/i.test(body);
  }

  private chatCompletion(body: unknown) {
    return httpRequest(`${this.apiBase()}/chat/completions`, {
      body,
      timeoutMs: this.options.timeoutMs,
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): Record<string, string> | undefined {
    const apiKey = this.options.apiKey?.trim();
    return apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
  }

  private apiBase(): string {
    const base = this.stripSlash(this.endpoint.trim());
    // Accept either a provider base URL, a /v1 URL, or the complete Chat
    // Completions URL copied from provider documentation.
    const withoutChatCompletions = base.replace(/\/chat\/completions$/i, '');
    return withoutChatCompletions.endsWith('/v1')
      ? withoutChatCompletions
      : `${withoutChatCompletions}/v1`;
  }

  private stripSlash(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
