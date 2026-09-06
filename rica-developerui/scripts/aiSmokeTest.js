'use strict';

/**
 * Live smoke test for the AI Reasoning adapter.
 * Validates the full round-trip against a REAL Ollama endpoint:
 *   1. isAvailable() ping
 *   2. buildMessages() -> evaluate() over a canned OrderResource context
 *   3. parseDecisions() -> normalized AiDecision[]
 * No VS Code required — runs from plain Node against compiled src output.
 *
 * Usage:
 *   node scripts/aiSmokeTest.js [endpoint] [model]
 *   OLLAMA_ENDPOINT=http://<tunnel-or-host>:11434 node scripts/aiSmokeTest.js
 * Defaults: endpoint http://localhost:11434, model qwen2.5-coder:7b
 *
 * Exit code 0 = full round-trip OK; 1 = ping/reachable failed; 2 = evaluate failed.
 */

const { OllamaAiAdapter } = require('../dist/infrastructure/ai/ollamaAiAdapter');
const { OpenAICompatibleAiAdapter } = require('../dist/infrastructure/ai/openaiCompatibleAiAdapter');
const { httpRequest } = require('../dist/infrastructure/ai/httpJson');

const endpoint = (process.argv[2] || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/+$/, '');
const model = process.argv[3] || process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const providerKind = process.env.AI_PROVIDER === 'openai-compatible' ? 'openai-compatible' : 'ollama';

const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 60000);

// Minimal but realistic bounded context mirroring aiAdvisory.test.js fixtures.
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
      reason: 'Endpoint returns internal domain object (OrderSaveResult) instead of a DTO (ambiguous)',
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
      reason: 'Mutating endpoint (POST) with no authorization annotation on the method or its call chain (semantic probe)',
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
    'Authentication is judged from method/class annotations only; framework-level security filters are not visible to RICA.',
    'Dynamic dispatch beyond simple-name/interface OR-branch expansion is not resolved in v1.',
  ],
};

async function main() {
  console.log(`[1/4] Provider : ${providerKind}`);
  console.log(`[1/4] Endpoint : ${endpoint}`);
  console.log(`[1/4] Model    : ${model}`);
  console.log(`[1/4] Timeout  : ${timeoutMs}ms`);
  console.log('');

  const timeout = { timeoutMs, maxTokensPerRequest: 2000 };
  const adapter = providerKind === 'openai-compatible'
    ? new OpenAICompatibleAiAdapter(endpoint, model, timeout)
    : new OllamaAiAdapter(endpoint, model, timeout);

  const t0 = Date.now();
  const available = await adapter.isAvailable();
  console.log(`[2/4] isAvailable() -> ${available}  (${Date.now() - t0}ms)`);
  if (!available) {
    console.error('');
    console.error(`ERROR: ${endpoint} is not reachable or does not answer /api/tags (ollama) or /models (openai-compatible).`);
    console.error('  - Local:  ensure `ollama serve` is running, then `ollama pull <model>`.');
    console.error('  - Colab:  paste your ngrok/cloudflared/Colab public URL as the endpoint.');
    console.error('  - Verify: curl ' + (providerKind === 'openai-compatible'
      ? `${endpoint}/models`
      : `${endpoint}/api/tags`));
    process.exit(1);
  }

  console.log('   context: ' + JSON.stringify(context).length + ' chars, ' +
    context.candidates.length + ' candidates, ' + context.executionPath.length + ' path steps');
  console.log('');

  const tw = Date.now();
  console.log('[3/4] warming model (loads weights into VRAM with a tiny request)...');
  try {
    await adapter.warmUp({ timeoutMs, numPredict: 8 });
    console.log(`   warm-up OK (${Date.now() - tw}ms)`);
  } catch (e) {
    console.error(`   warm-up failed (${Date.now() - tw}ms) — continuing anyway: ${e.message}`);
  }
  console.log('');

  console.log('[4/4] evaluate() -> sending to model...');
  try {
    const decisions = await adapter.evaluate(context);
    const latency = Date.now() - t0;
    console.log(`   OK (${latency}ms). Parsed ${decisions.length} decision(s):`);
    for (const d of decisions) {
      console.log(`   - ${d.violationId || '(probe)'} : ${d.verdict} conf=${d.confidence} findings=${d.findings.length}`);
      console.log(`     reasoning: ${d.reasoning}`);
      if (d.findings[0]?.quickFix) {
        console.log(`     quickFix : ${d.findings[0].quickFix.title} (${d.findings[0].quickFix.edits.length} edit(s))`);
      }
    }
    console.log('');
    console.log('[5/4] DONE — full LLM round-trip OK.');
    process.exit(0);
  } catch (e) {
    console.error('');
    console.error(`ERROR during evaluate(): ${e.message}`);
    console.error('  - Model not pulled?    `ollama pull ' + model + '`  (or your Colab notebook did not pull it).');
    console.error('  - Wrong schema reply?  Some models ignore "format":"json"; the response may need stricter prompting.');
    console.error('  - Tunnel down?        Check the Colab notebook is still running and the tunnel URL is current.');
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
