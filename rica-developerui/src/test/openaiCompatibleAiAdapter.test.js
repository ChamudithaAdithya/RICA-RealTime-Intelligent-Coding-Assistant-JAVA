'use strict';

const assert = require('assert');
const http = require('http');
const { OpenAICompatibleAiAdapter } = require('../../dist/infrastructure/ai/openaiCompatibleAiAdapter');

describe('OpenAICompatibleAiAdapter', () => {
  let server;
  let baseUrl;
  const requests = [];

  before(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requests.push({ method: req.method, url: req.url, headers: req.headers, body });
        res.setHeader('Content-Type', 'application/json');
        if (req.url === '/v1/models') {
          res.end('{"data":[{"id":"gpt-4o-mini"}]}');
          return;
        }
        if (req.url === '/v1/chat/completions') {
          const payload = JSON.parse(body);
          const userMessage = payload.messages.find(message => message.role === 'user');
          const context = JSON.parse(userMessage.content).context;
          const splitCandidates = context.candidates.filter(candidate => candidate.violationId.startsWith('split-'));
          if (splitCandidates.length > 1) {
            res.end(JSON.stringify({
              choices: [{
                finish_reason: 'length',
                message: { content: '{"decisions":[{"violationId":"split-a"' },
              }],
            }));
            return;
          }
          if (splitCandidates.length === 1) {
            const violationId = splitCandidates[0].violationId;
            res.end(JSON.stringify({
              choices: [{
                finish_reason: 'stop',
                message: {
                  content: JSON.stringify({
                    decisions: [{
                      violationId,
                      verdict: 'VIOLATION',
                      confidence: 0.91,
                      reasoning: `reviewed ${violationId}`,
                      findings: [],
                      ambiguityResolution: null,
                    }],
                  }),
                },
              }],
            }));
            return;
          }
          res.end(JSON.stringify({
            choices: [{
              finish_reason: 'stop',
              message: {
                content: '{"decisions":[{"violationId":"v1","verdict":"NO_VIOLATION","confidence":0.88,"reasoning":"reviewed","findings":[]}]}',
              },
            }],
          }));
          return;
        }
        res.statusCode = 404;
        res.end('{"error":"not found"}');
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    requests.length = 0;
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('uses the OpenAI endpoint, Bearer key, gpt-4o-mini, and strict Structured Outputs', async () => {
    const adapter = new OpenAICompatibleAiAdapter(
      `${baseUrl}/v1/chat/completions`,
      'gpt-4o-mini',
      { timeoutMs: 3000, maxTokensPerRequest: 1000, apiKey: ' test-key ' },
    );

    assert.strictEqual(await adapter.isAvailable(), true);
    const decisions = await adapter.evaluate({
      language: 'java',
      boundary: 'controller -> service',
      candidates: [],
      executionPath: [],
      riskNotes: [],
    });

    assert.strictEqual(decisions[0].verdict, 'NO_VIOLATION');
    assert.strictEqual(requests[0].url, '/v1/models');
    assert.strictEqual(requests[1].url, '/v1/chat/completions');
    assert.strictEqual(requests[1].headers.authorization, 'Bearer test-key');
    const payload = JSON.parse(requests[1].body);
    assert.strictEqual(payload.model, 'gpt-4o-mini');
    assert.strictEqual(payload.response_format.type, 'json_schema');
    assert.strictEqual(payload.response_format.json_schema.strict, true);
    assert.strictEqual(payload.response_format.json_schema.schema.additionalProperties, false);
  });

  it('retries a truncated multi-candidate response as smaller batches', async () => {
    const adapter = new OpenAICompatibleAiAdapter(
      baseUrl,
      'gpt-4o-mini',
      { timeoutMs: 3000, maxTokensPerRequest: 1000, apiKey: 'test-key' },
    );
    const makeCandidate = violationId => ({
      violationId,
      code: 'RICA-V000',
      ruleName: 'test rule',
      filePath: `src/${violationId}.java`,
      lineNumber: 1,
      severity: 'warning',
      reason: 'test reason',
      featureType: 'ambiguity',
      evidence: 'test evidence',
    });

    const decisions = await adapter.evaluate({
      language: 'java',
      boundary: 'controller -> service',
      candidates: [makeCandidate('split-a'), makeCandidate('split-b')],
      executionPath: [],
      riskNotes: [],
    });

    assert.deepStrictEqual(decisions.map(decision => decision.violationId), ['split-a', 'split-b']);
    assert.strictEqual(requests.length, 3);
    assert.ok(requests.every(request => JSON.parse(request.body).response_format.type === 'json_schema'));
  });
});
