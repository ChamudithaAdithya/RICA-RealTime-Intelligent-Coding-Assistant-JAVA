'use strict';

/**
 * Live smoke test for the AI advisory adapter.
 *
 * It validates a real provider round trip without starting VS Code:
 *   1. provider reachability check
 *   2. chat completion over a small RICA diagnostic context
 *   3. parsed AiDecision[] output
 *
 * Ollama:
 *   npm run compile
 *   node scripts/aiSmokeTest.js
 *   OLLAMA_ENDPOINT=http://localhost:11434 OLLAMA_MODEL=qwen2.5-coder:7b node scripts/aiSmokeTest.js
 *
 * OpenAI with gpt-4o-mini:
 *   npm run compile
 *   AI_PROVIDER=openai-compatible AI_ENDPOINT=https://api.openai.com AI_MODEL=gpt-4o-mini AI_API_KEY=<key> node scripts/aiSmokeTest.js
 *
 * Exit code 0 = full round trip OK.
 * Exit code 1 = provider health/reachability failed.
 * Exit code 2 = model response/parsing failed.
 */

const { OllamaAiAdapter } = require('../dist/infrastructure/ai/ollamaAiAdapter');
const { OpenAICompatibleAiAdapter } = require('../dist/infrastructure/ai/openaiCompatibleAiAdapter');

const providerKind = process.env.AI_PROVIDER === 'openai-compatible' ? 'openai-compatible' : 'ollama';
const defaultEndpoint = providerKind === 'openai-compatible'
  ? (process.env.AI_ENDPOINT || 'https://api.openai.com')
  : (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434');
const endpoint = (process.argv[2] || defaultEndpoint).replace(/\/+$/, '');
const defaultModel = providerKind === 'openai-compatible' ? 'gpt-4o-mini' : 'qwen2.5-coder:7b';
const model = process.argv[3] || process.env.AI_MODEL || process.env.OLLAMA_MODEL || defaultModel;
const timeoutMs = Number(process.env.AI_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS || 60000);
const maxTokensPerRequest = Number(process.env.AI_MAX_TOKENS || 4096);
const apiKey = process.env.AI_API_KEY || '';

const context = {
  language: 'java',
  boundary: 'controller -> service -> repository; entity/dto never cross the API boundary',
  candidates: [
    {
      violationId: 'APIResourceLayer-com.example.api.OrderResource-placeOrder--exposing-internal-structure-14',
      code: 'RICA-V207',
      ruleName: 'exposing internal structure',
      filePath: 'src/main/java/com/example/api/OrderResource.java',
      lineNumber: 14,
      severity: 'warning',
      reason: 'Endpoint returns internal domain object instead of a DTO.',
      featureType: 'ambiguity',
      evidence: 'OrderResource.placeOrder',
    },
    {
      violationId: '',
      code: 'RICA-V000',
      ruleName: 'advisory-missing-authorization-check',
      filePath: 'src/main/java/com/example/api/OrderResource.java',
      lineNumber: 12,
      severity: 'warning',
      reason: 'Mutating endpoint with no visible authorization annotation.',
      featureType: 'missingCheck',
      evidence: 'OrderResource.placeOrder(OrderRequest)',
    },
  ],
  executionPath: [
    {
      caller: 'com.example.api.OrderResource.placeOrder(OrderRequest)',
      file: 'src/main/java/com/example/api/OrderResource.java',
      hasAuthAnnotation: false,
      isPrivilegedOperation: true,
      calls: ['com.example.service.OrderService.placeOrder(OrderRequest)'],
      ambiguousCallees: [],
      sourceSlices: [
        '@PostMapping("/orders")',
        'public OrderSaveResult placeOrder(@Valid @RequestBody OrderRequest request) {',
        '  return orderService.placeOrder(request);',
        '}',
      ],
    },
    {
      caller: 'com.example.service.OrderService.placeOrder(OrderRequest)',
      file: 'src/main/java/com/example/service/OrderService.java',
      hasAuthAnnotation: false,
      isPrivilegedOperation: true,
      calls: ['com.example.repo.OrderRepository.saveAsNew(Order)'],
      ambiguousCallees: [],
      sourceSlices: [
        'public OrderSaveResult placeOrder(OrderRequest request) {',
        '  Order order = mapper.map(request);',
        '  return orderRepository.saveAsNew(order);',
        '}',
      ],
    },
    {
      caller: 'com.example.repo.OrderRepository.saveAsNew(Order)',
      file: 'src/main/java/com/example/repo/OrderRepository.java',
      hasAuthAnnotation: false,
      isPrivilegedOperation: false,
      calls: [],
      ambiguousCallees: [],
      sourceSlices: [],
    },
  ],
  riskNotes: [
    'Authentication is judged from method/class annotations only.',
    'Framework-level filters may exist outside the visible source slice.',
  ],
};

async function main() {
  console.log(`[1/4] Provider : ${providerKind}`);
  console.log(`[1/4] Endpoint : ${endpoint}`);
  console.log(`[1/4] Model    : ${model}`);
  console.log(`[1/4] Timeout  : ${timeoutMs}ms`);
  console.log(`[1/4] API key  : ${providerKind === 'openai-compatible' ? (apiKey ? 'set' : 'missing') : 'not required'}`);
  console.log('');

  const adapterOptions = { timeoutMs, maxTokensPerRequest, apiKey };
  const adapter = providerKind === 'openai-compatible'
    ? new OpenAICompatibleAiAdapter(endpoint, model, adapterOptions)
    : new OllamaAiAdapter(endpoint, model, adapterOptions);

  const t0 = Date.now();
  const available = await adapter.isAvailable();
  console.log(`[2/4] isAvailable() -> ${available} (${Date.now() - t0}ms)`);
  if (!available) {
    console.error('');
    console.error(`ERROR: ${endpoint} is not reachable or did not accept the configured credentials.`);
    if (providerKind === 'openai-compatible') {
      console.error('  - Check AI_ENDPOINT, for example: https://agentrouter.org');
      console.error('  - Check AI_MODEL, for example: glm-5.3');
      console.error('  - Check AI_API_KEY is set in this terminal session.');
    } else {
      console.error('  - Ensure `ollama serve` is running.');
      console.error('  - Ensure the model is pulled, for example: ollama pull qwen2.5-coder:7b');
    }
    process.exit(1);
  }

  console.log(`   context: ${JSON.stringify(context).length} chars, ${context.candidates.length} candidates, ${context.executionPath.length} path steps`);
  console.log('');
  console.log('[3/4] Provider reachable; sending advisory context...');

  try {
    const decisions = await adapter.evaluate(context);
    const latency = Date.now() - t0;
    console.log(`[4/4] OK (${latency}ms). Parsed ${decisions.length} decision(s):`);
    for (const d of decisions) {
      console.log(`   - ${d.violationId || '(probe)'} : ${d.verdict} conf=${d.confidence} findings=${d.findings.length}`);
      console.log(`     reasoning: ${d.reasoning}`);
      if (d.findings[0]?.quickFix) {
        console.log(`     quickFix : ${d.findings[0].quickFix.title} (${d.findings[0].quickFix.edits.length} edit(s))`);
      }
    }
    console.log('');
    console.log('DONE - full AI advisory round trip OK.');
    process.exit(0);
  } catch (e) {
    console.error('');
    console.error(`ERROR during evaluate(): ${e.message}`);
    if (providerKind === 'openai-compatible') {
      console.error('  - Check that the model is available to your account.');
      console.error('  - Some routed models ignore JSON-only instructions; try a stronger coding model if parsing fails.');
      console.error('  - If authentication failed, regenerate the key and set AI_API_KEY again.');
    } else {
      console.error('  - Check the Ollama model name and server status.');
    }
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
