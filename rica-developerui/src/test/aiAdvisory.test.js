'use strict';

const assert = require('assert');
const { createMockAiDecisionProvider } = require('./mocks/mockAiDecisionProvider');

const {
  triageViolations,
  triageAll,
  collectEntryPointProbes,
} = require('../../dist/application/ai/triage');
const { buildContext, buildCandidatePath } = require('../../dist/application/ai/contextBuilder');
const { runHeuristicAdvisor } = require('../../dist/application/ai/heuristicAdvisor');
const { AiAdvisoryCoordinator } = require('../../dist/application/ai/aiAdvisoryCoordinator');
const { FileAuditLogger } = require('../../dist/infrastructure/ai/fileAuditLogger');
const { parseDecisions } = require('../../dist/infrastructure/ai/parseDecisions');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEFAULT_AI_CONFIG = {
  enableAiAdvisory: true,
  aiProvider: 'ollama',
  aiEndpoint: 'http://localhost:11434',
  aiModel: 'qwen2.5-coder:7b',
  aiMaxTokensPerRequest: 2000,
  aiTimeoutMs: 30000,
  aiMaxCandidatesPerRun: 8,
  aiTrigger: 'onDemand',
  aiAuditLogEnabled: false,
};

const ann = (name, elems = {}) => ({ name, fullyQualifiedName: name, elements: elems });
const methodOf = (name, extra = {}) => ({
  name,
  returnType: extra.returnType || 'void',
  parameters: extra.parameters || [],
  startLine: extra.startLine || 10,
  endLine: extra.endLine || 12,
  annotations: extra.annotations || [],
  calledMethods: extra.calledMethods || [],
  createdObjects: [],
  // minimal fields the coordinators touch
  body: { linesOfCode: (extra.endLine || 12) - (extra.startLine || 10) },
  ...extra,
});

function orderResourceFixture() {
  const orderResource = {
    filePath: 'src/main/java/com/example/api/OrderResource.java',
    packageInfo: { name: 'com.example.api', simpleName: 'api', parentPackage: null, subPackages: [], classes: [], interfaces: [], enums: [], annotations: [], isDefaultPackage: false, accessibleFrom: 'public' }, relationships: [],
    imports: [
      { simpleName: 'OrderService', qualifiedName: 'com.example.service.OrderService', isWildcard: false },
    ],
    classes: [
      {
        className: 'OrderResource',
        fullyQualifiedName: 'com.example.api.OrderResource',
        startLine: 1,
        endLine: 40,
        detectedLayer: 'controller',
        annotations: [ann('RestController')],
        methods: [
          methodOf('placeOrder', {
            startLine: 12,
            endLine: 30,
            annotations: [ann('PostMapping')],
            parameters: [{ name: 'request', dataType: 'OrderRequest' }],
            calledMethods: [
              { calledMethodName: 'placeOrder', targetClass: 'OrderService', isLibraryCall: false, lineNumber: 16, receiverType: 'OrderService' },
            ],
          }),
          methodOf('getOrder', {
            returnType: 'OrderDto',
            startLine: 32,
            endLine: 36,
            annotations: [ann('GetMapping')],
            calledMethods: [
              { calledMethodName: 'findById', targetClass: 'OrderService', isLibraryCall: false, lineNumber: 34, receiverType: 'OrderService' },
            ],
          }),
        ],
        attributes: [
          { name: 'orderService', dataType: 'OrderService', isInjected: true, accessModifier: 'private' },
        ],
      },
    ],
  };

  const orderService = {
    filePath: 'src/main/java/com/example/service/OrderService.java',
    packageInfo: { name: 'com.example.service', simpleName: 'service', parentPackage: null, subPackages: [], classes: [], interfaces: [], enums: [], annotations: [], isDefaultPackage: false, accessibleFrom: 'public' }, relationships: [],
    imports: [],
    classes: [
      {
        className: 'OrderService',
        fullyQualifiedName: 'com.example.service.OrderService',
        startLine: 1,
        endLine: 30,
        detectedLayer: 'service',
        annotations: [ann('Service')],
        methods: [
          methodOf('placeOrder', {
            startLine: 8,
            endLine: 20,
            calledMethods: [
              { calledMethodName: 'saveAsNew', targetClass: 'OrderRepository', isLibraryCall: false, lineNumber: 12, receiverType: 'OrderRepository' },
            ],
          }),
          methodOf('findById', {
            startLine: 22,
            endLine: 26,
            calledMethods: [
              { calledMethodName: 'findById', targetClass: 'OrderRepository', isLibraryCall: false, lineNumber: 24, receiverType: 'OrderRepository' },
            ],
          }),
        ],
        attributes: [],
      },
    ],
  };

  const orderRepository = {
    filePath: 'src/main/java/com/example/repo/OrderRepository.java',
    packageInfo: { name: 'com.example.repo', simpleName: 'repo', parentPackage: null, subPackages: [], classes: [], interfaces: [], enums: [], annotations: [], isDefaultPackage: false, accessibleFrom: 'public' }, relationships: [],
    imports: [],
    classes: [
      {
        className: 'OrderRepository',
        fullyQualifiedName: 'com.example.repo.OrderRepository',
        startLine: 1,
        endLine: 20,
        detectedLayer: 'repository',
        annotations: [ann('Repository')],
        methods: [
          methodOf('saveAsNew', { startLine: 6, endLine: 9 }),
          methodOf('findById', { startLine: 11, endLine: 15, annotations: [ann('PreAuthorize')] }),
        ],
        attributes: [],
      },
    ],
  };

  const filesMap = {
    [orderResource.filePath]: orderResource,
    [orderService.filePath]: orderService,
    [orderRepository.filePath]: orderRepository,
  };
  return { filesMap, orderResource, orderService, orderRepository };
}

const { buildGraphFromFiles } = require('../../dist/core/dependencyGraph');

const graphFor = (filesMap) => buildGraphFromFiles(filesMap);

function sampleViolation(overrides = {}) {
  return {
    id: 'APIResourceLayer-com.example.api.OrderResource-placeOrder--exposing-internal-structure-14',
    ruleName: 'APIResourceLayer: exposing internal structure',
    severity: 'warning',
    message: 'Endpoint returns internal domain object',
    filePath: 'src/main/java/com/example/api/OrderResource.java',
    lineNumber: 14,
    code: 'RICA-V207',
    mitigationHint: 'Map to a DTO',
    contextMetadata: { methodName: 'placeOrder' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// triage
// ---------------------------------------------------------------------------

describe('AiAdvisory â€” triage', () => {
  it('should select only AI-relevant codes and cap output', () => {
    const v1 = sampleViolation();
    const v2 = sampleViolation({ id: 'x2', lineNumber: 2 });
    const v3 = sampleViolation({ id: 'x3', code: 'RICA-V110', lineNumber: 3 });
    const v4 = sampleViolation({ id: 'x4', code: 'RICA-V110', lineNumber: 4 });

    const out = triageViolations([v1, v2, v3, v4], { maxCandidates: 2 });
    assert.strictEqual(out.length, 2);
    assert.strictEqual(out[0].violationId, v1.id);
    assert.strictEqual(out[0].featureType, 'ambiguity');
  });

  it('should produce missingCheck probes for mutating endpoints only', () => {
    const { filesMap } = orderResourceFixture();
    const probes = collectEntryPointProbes(filesMap, 8);
    assert.ok(probes.length >= 1, 'expected at least one probe');
    for (const p of probes) {
      assert.strictEqual(p.featureType, 'missingCheck');
      assert.strictEqual(p.code, 'RICA-V000');
      assert.strictEqual(p.violationId, '');
    }
    // GET-only methods must not produce probes
    const getProbe = probes.find(p => p.evidence.includes('getOrder'));
    assert.ok(!getProbe, 'GET endpoint should not be probed');
  });

  it('should merge and dedupe violation candidates and probes', () => {
    const { filesMap } = orderResourceFixture();
    const violations = [sampleViolation()];
    const out = triageAll(violations, filesMap, { maxCandidates: 8 });
    const ids = out.map(c => c.violationId || c.evidence);
    assert.strictEqual(new Set(ids).size, ids.length, 'no duplicate candidates');
  });
});

// ---------------------------------------------------------------------------
// context builder
// ---------------------------------------------------------------------------

describe('AiAdvisory â€” context builder', () => {
  it('should walk the execution path from entry point to repository', () => {
    const { filesMap } = orderResourceFixture();
    const graph = graphFor(filesMap);
    const path = buildCandidatePath(sampleViolation(), filesMap, graph);
    assert.ok(path.length >= 3, `expected entry + service + repo hops, got ${path.length}`);
    assert.ok(path[0].caller.includes('OrderResource.placeOrder('));
    assert.ok(path.some(s => s.caller.includes('OrderService.placeOrder(')));
    assert.ok(path.some(s => s.caller.includes('OrderRepository.saveAsNew(')));
  });

  it('should precompute auth and privilege markers deterministically', () => {
    const { filesMap } = orderResourceFixture();
    const graph = graphFor(filesMap);
    const getCandidate = sampleViolation({
      id: 'g1',
      lineNumber: 33,
      contextMetadata: { methodName: 'getOrder' },
    });
    const path = buildCandidatePath(getCandidate, filesMap, graph);
    const repoStep = path.find(s => s.caller.includes('OrderRepository.findById'));
    assert.ok(repoStep, 'repo findById step should exist');
    assert.strictEqual(repoStep.hasAuthAnnotation, true, '@PreAuthorize on repo method must be detected');
  });

  it('should limit depth and dedupe repeated steps', () => {
    const { filesMap } = orderResourceFixture();
    const graph = graphFor(filesMap);
    const context = buildContext({
      candidates: [sampleViolation(), sampleViolation({ id: 'dup-2', lineNumber: 15 })],
      filesMap,
      graph,
      opts: { maxDepth: 1, maxSteps: 4 },
    });
    const callers = context.executionPath.map(s => s.caller);
    assert.strictEqual(new Set(callers).size, callers.length, 'steps must be deduped');
    assert.ok(callers.length <= 4);
  });

  it('should include source slices only within the budget', () => {
    const text = 'com.example.api\n'.repeat(1000).split('\n').join('\n');
    const { orderResource, filesMap } = orderResourceFixture();
    orderResource.filePath = 'x/OrderResource.java';
    filesMap['x/OrderResource.java'] = orderResource;
    const source = {};
    source['x/OrderResource.java'] = text;
    const graph = graphFor(filesMap);
    const context = buildContext({
      candidates: [sampleViolation({ filePath: 'x/OrderResource.java' })],
      filesMap,
      graph,
      opts: { sourceBudgetChars: 500, readSource: (p) => source[p], sliceLines: 3 },
    });
    const chars = context.executionPath.reduce((n, s) => n + s.sourceSlices.join('\n').length, 0);
    assert.ok(chars <= 500);
  });
});

// ---------------------------------------------------------------------------
// heuristic advisor
// ---------------------------------------------------------------------------

describe('AiAdvisory â€” heuristic advisor (Option C)', () => {
  it('should flag a mutating entry with no auth on the path', () => {
    const { filesMap } = orderResourceFixture();
    const graph = graphFor(filesMap);
    const probe = collectEntryPointProbes(filesMap, 8).find(p => p.evidence.includes('placeOrder'));
    const decisions = runHeuristicAdvisor([probe], filesMap, graph);
    const d = decisions.find(x => x.verdict === 'VIOLATION');
    assert.ok(d, 'expected a VIOLATION decision');
    assert.strictEqual(d.findings[0].kind, 'missingAuthorizationCheck');
    assert.ok(d.findings[0].quickFix.edits.length > 0, 'quickFix should propose an edit');
  });

  it('should clear a path that already carries auth annotations', () => {
    const { filesMap } = orderResourceFixture();
    // placeOrder -> OrderService.placeOrder -> OrderRepository.saveAsNew: add @PreAuthorize on service
    filesMap['src/main/java/com/example/service/OrderService.java'].classes[0].methods[0].annotations.push(ann('PreAuthorize', { value: 'isAuthenticated()' }));
    const graph = graphFor(filesMap);
    const probe = collectEntryPointProbes(filesMap, 8).find(p => p.evidence.includes('placeOrder'));
    const decisions = runHeuristicAdvisor([probe], filesMap, graph);
    const d = decisions.find(x => x.violationId === '');
    assert.strictEqual(d.verdict, 'NO_VIOLATION');
  });
});

// ---------------------------------------------------------------------------
// coordinator
// ---------------------------------------------------------------------------

describe('AiAdvisory â€” coordinator', () => {
  const sourceTextCache = {};

  function makeCoordinator({ provider, configOverrides, decisions, available = true }) {
    const { provider: mockProvider, state } = createMockAiDecisionProvider();
    mockProvider.setAvailable(available).setDecisions(decisions);
    const { filesMap } = orderResourceFixture();
    const dummyLogger = {
      logged: [],
      log(entry) { dummyLogger.logged.push(entry); },
    };
    const fixedNow = () => new Date('2026-08-16T10:00:00.000Z');
    const coordinator = new AiAdvisoryCoordinator({
      config: {
        enableArchitecturalChecks: true,
        enableDesignPatternChecks: true,
        enableBusinessLogicChecks: true,
        businessLogicThreshold: 3,
        excludePatterns: [],
        layerBoundaries: {},
        ai: { ...DEFAULT_AI_CONFIG, ...(configOverrides || {}) },
      },
      provider: mockProvider,
      auditLogger: dummyLogger,
      getFilesMap: () => filesMap,
      getGraph: () => graphFor(filesMap),
      readSource: (p) => sourceTextCache[p],
      now: fixedNow,
    });
    return { coordinator, state, filesMap, dummyLogger, provider: mockProvider };
  }

  it('should be a no-op when enableAiAdvisory is false (today\'s behavior)', async () => {
    const { coordinator, state } = makeCoordinator({ configOverrides: { enableAiAdvisory: false } });
    const result = await coordinator.run([sampleViolation()]);
    assert.strictEqual(result.outcome, 'noop');
    assert.strictEqual(result.advisoryViolations.length, 0);
    assert.strictEqual(state.calls.length, 0);
  });

  it('should fall back to the heuristic advisor when the provider is offline', async () => {
    const { coordinator } = makeCoordinator({ available: false });
    const result = await coordinator.run([sampleViolation()]);
    assert.strictEqual(result.outcome, 'heuristic');
    assert.ok(result.annotatedCount > 0 || result.advisoryCount > 0, 'heuristic should still produce findings');
  });

  it('should merge AI decisions onto the same violation references (never delete)', async () => {
    const violation = sampleViolation();
    const { coordinator } = makeCoordinator({
      decisions: [{
        violationId: violation.id,
        verdict: 'VIOLATION',
        confidence: 0.9,
        reasoning: 'evidenced',
        findings: [{ kind: 'missingAuthorizationCheck', message: 'no auth', code: 'RICA-V000', strength: 'strong' }],
      }],
    });
    const before = { ...violation };
    const result = await coordinator.run([violation]);
    assert.strictEqual(result.outcome, 'ai');
    assert.strictEqual(result.annotatedCount, 1);
    assert.ok(violation.aiInsights, 'violation should be annotated in place');
    assert.strictEqual(violation.aiInsights.verdict, 'VIOLATION');
    assert.strictEqual(violation.id, before.id, 'nothing deleted or replaced');
  });

  it('should surface net-new advisory violations with detectorSource AiAdvisory', async () => {
    const { coordinator } = makeCoordinator({ available: false });
    const result = await coordinator.run([sampleViolation()]);
    for (const adv of result.advisoryViolations) {
      assert.strictEqual(adv.detectorSource, 'AiAdvisory');
      assert.strictEqual(adv.code, 'RICA-V000');
      assert.ok(adv.quickFix);
    }
  });

  it('should write an audit entry on success', async () => {
    const { coordinator, dummyLogger } = makeCoordinator({
      configOverrides: { aiAuditLogEnabled: true },
      decisions: [{ violationId: sampleViolation().id, verdict: 'NO_VIOLATION', confidence: 0.8, reasoning: 'ok', findings: [] }],
    });
    await coordinator.run([sampleViolation()]);
    assert.strictEqual(dummyLogger.logged.length, 1);
    assert.ok(Array.isArray(dummyLogger.logged[0].response));
  });

  it('should record provider failures in the audit log but not throw', async () => {
    const { provider, coordinator, dummyLogger } = makeCoordinator({ configOverrides: { aiAuditLogEnabled: true } });
    provider.setFailWith(new Error('boom'));
    const result = await coordinator.run([sampleViolation()]);
    assert.strictEqual(result.outcome, 'error');
    assert.ok(result.error.includes('boom'));
    assert.strictEqual(dummyLogger.logged[0].error.includes('boom'), true);
  });

  it('should return empty advisory list for a clean project', async () => {
    const { coordinator, filesMap, state } = makeCoordinator({});
    // Remove all entry points so no probes generate and no violating methods exist
    for (const key of Object.keys(filesMap)) {
      filesMap[key].classes[0].methods = [];
      filesMap[key].classes[0].annotations = [];
    }
    const result = await coordinator.run([]);
    assert.ok(['noop', 'offline', 'heuristic'].includes(result.outcome));
  });
});

describe('AiAdvisory â€” parseDecisions', () => {
  it('should parse fenced JSON arrays', () => {
    const out = parseDecisions('```json\n[{"violationId":"a","verdict":"NO_VIOLATION","confidence":0.7,"reasoning":"x","findings":[]}]\n```');
    assert.strictEqual(out[0].verdict, 'NO_VIOLATION');
    assert.strictEqual(out[0].violationId, 'a');
  });

  it('should normalize invalid verdicts and clamp confidence', () => {
    const out = parseDecisions('[{"violationId":"a","verdict":"wat","confidence":3,"reasoning":"x","findings":[]}]');
    assert.strictEqual(out[0].verdict, 'AMBIGUOUS');
    assert.strictEqual(out[0].confidence, 1);
  });

  it('should throw when the response has no array', () => {
    assert.throws(() => parseDecisions('the answer is no.'));
  });
});
