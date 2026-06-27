const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-Memory State ─────────────────────────────────────────────────────────
const state = {
  files: {},               // filePath → FullASTOutput
  graph: { nodes: [], edges: [] },
  violations: [],
  history: [],
};

// ─── Build Dependency Graph from AST Files ───────────────────────────────────
function buildGraph() {
  const nodesMap = new Map();
  const edges = [];
  const seen = new Set();

  for (const [filePath, ast] of Object.entries(state.files)) {
    for (const cls of ast.classes || []) {
      const nodeId = cls.fullyQualifiedName || cls.className;
      if (!nodesMap.has(nodeId)) {
        nodesMap.set(nodeId, {
          id: nodeId,
          type: cls.classType === 'interface' ? 'interface' : 'class',
          layer: cls.detectedLayer || 'unknown',
          filePath: filePath,
          simpleName: cls.className,
          packageName: ast.packageInfo?.name || '',
        });
      }
    }

    for (const rel of ast.relationships || []) {
      const edgeKey = `${rel.sourceId}|${rel.targetId}|${rel.type}`;
      if (!seen.has(edgeKey)) {
        seen.add(edgeKey);
        edges.push({
          id: `e${edges.length}`,
          source: rel.sourceId,
          target: rel.targetId,
          type: rel.type,
          weight: 1,
        });
      }
    }
  }

  state.graph = {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

// ─── Rule Code Mapping (mirrors violationManager.ts) ─────────────────────────
const RULE_CODE_MAP = {
  'self-instantiation': 'RICA-V101',
  'uninjected-repository-access': 'RICA-V102',
  'uninjected-service-access': 'RICA-V103',
  'anemic-service': 'RICA-V104',
  'package-violation': 'RICA-V105',
  'business-logic': 'RICA-V106',
  'direct-layer-access': 'RICA-V107',
  'anemic-entity': 'RICA-V108',
  'improper-data-access': 'RICA-V109',
  'exposing-internal-entity': 'RICA-V201',
  'missing-dto-usage': 'RICA-V202',
  'improper-error-handling': 'RICA-V203',
  'business-logic-in-resource': 'RICA-V204',
  'direct-service-instantiation': 'RICA-V205',
  'missing-validation': 'RICA-V206',
  'exposing-internal-structure': 'RICA-V207',
};

// ─── Detect Local Violations ─────────────────────────────────────────────────
function detectLocalViolations() {
  const violations = [];

  for (const [filePath, ast] of Object.entries(state.files)) {
    for (const cls of ast.classes || []) {
      const layer = cls.detectedLayer;

      if (layer === 'service') {
        for (const field of cls.attributes || []) {
          if (isRepositoryType(field.dataType) && !field.isInjected) {
            violations.push(makeViolation(filePath, cls, {
              type: 'uninjected-repository-access',
              severity: 'error',
              message: `Service class '${cls.className}' has uninjected repository field '${field.name}' of type ${field.dataType}.`,
              fieldName: field.name,
              range: fieldRange(field),
            }));
          }
        }
        for (const method of cls.methods || []) {
          for (const call of method.calledMethods || []) {
            if (call.targetClass && !call.receiverIsInjected) {
              const target = resolveClassLayer(call.targetClass);
              if (target === 'repository' || target === 'dao') {
                violations.push(makeViolation(filePath, cls, {
                  type: 'uninjected-repository-access',
                  severity: 'error',
                  message: `Service method '${method.name}' accesses repository '${call.targetClass}' via uninjected field/parameter.`,
                  methodName: method.name,
                  lineNumber: call.lineNumber,
                  range: callRange(call),
                }));
              }
            }
          }
          for (const creation of method.createdObjects || []) {
            if (isRepositoryName(creation.className) || isInfrastructureName(creation.className)) {
              violations.push(makeViolation(filePath, cls, {
                type: 'self-instantiation',
                severity: 'error',
                message: `Service method '${method.name}' instantiates ${creation.className} directly.`,
                methodName: method.name,
                lineNumber: creation.lineNumber,
                range: lineRange(creation.lineNumber),
              }));
            }
          }
        }
      }

      if (layer === 'controller') {
        for (const field of cls.attributes || []) {
          if ((isServiceType(field.dataType) || isRepositoryType(field.dataType)) && !field.isInjected) {
            violations.push(makeViolation(filePath, cls, {
              type: 'uninjected-service-access',
              severity: 'error',
              message: `Controller class '${cls.className}' has uninjected ${isServiceType(field.dataType) ? 'service' : 'repository'} field '${field.name}'.`,
              fieldName: field.name,
              range: fieldRange(field),
            }));
          }
        }
        for (const method of cls.methods || []) {
          for (const call of method.calledMethods || []) {
            if (call.targetClass && !call.receiverIsInjected) {
              const target = resolveClassLayer(call.targetClass);
              if (target === 'service' || target === 'repository' || target === 'dao') {
                violations.push(makeViolation(filePath, cls, {
                  type: 'uninjected-service-access',
                  severity: 'error',
                  message: `Controller method '${method.name}' accesses ${target} '${call.targetClass}' via uninjected field/parameter.`,
                  methodName: method.name,
                  lineNumber: call.lineNumber,
                  range: callRange(call),
                }));
              }
            }
          }
          for (const creation of method.createdObjects || []) {
            if (isServiceName(creation.className) || isRepositoryName(creation.className)) {
              violations.push(makeViolation(filePath, cls, {
                type: 'self-instantiation',
                severity: 'error',
                message: `Controller method '${method.name}' instantiates ${creation.className} directly.`,
                methodName: method.name,
                lineNumber: creation.lineNumber,
                range: lineRange(creation.lineNumber),
              }));
            }
          }
        }
      }

      if (layer === 'entity') {
        if (cls.methods.length > 0) {
          let getterSetter = 0;
          for (const m of cls.methods) {
            if ((m.name.startsWith('get') && m.parameters.length === 0) ||
                (m.name.startsWith('set') && m.parameters.length === 1)) {
              getterSetter++;
            }
          }
          if (getterSetter / cls.methods.length > 0.8) {
            violations.push(makeViolation(filePath, cls, {
              type: 'anemic-entity',
              severity: 'info',
              message: `Entity class '${cls.className}' appears to be anemic (primarily getters/setters).`,
              range: classRange(cls),
            }));
          }
        }
      }
    }
  }

  return violations;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeViolation(filePath, cls, extra) {
  const type = extra.type || 'unknown';
  return {
    id: `${cls.fullyQualifiedName || cls.className}-${extra.methodName || ''}-${extra.fieldName || ''}-${type}-${extra.lineNumber || 0}`,
    code: RULE_CODE_MAP[type] || 'RICA-V000',
    ruleName: type.replace(/-/g, ' '),
    severity: extra.severity || 'error',
    message: extra.message,
    filePath,
    lineNumber: extra.lineNumber,
    range: extra.range || undefined,
    mitigationHint: getHint(type),
    detectorSource: 'Engine',
    contextMetadata: {
      methodName: extra.methodName,
      fieldName: extra.fieldName,
    },
  };
}

function fieldRange(field) {
  if (!field.startLine) return undefined;
  return {
    start: { line: field.startLine, character: field.startColumn || 0 },
    end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
  };
}

function callRange(call) {
  if (!call.lineNumber) return undefined;
  return {
    start: { line: call.lineNumber, character: call.column || 0 },
    end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName ? call.calledMethodName.length : 8) },
  };
}

function lineRange(line) {
  if (!line) return undefined;
  return { start: { line, character: 0 }, end: { line, character: 80 } };
}

function classRange(cls) {
  if (!cls.startLine) return undefined;
  return {
    start: { line: cls.startLine, character: cls.startColumn || 0 },
    end: { line: cls.endLine || cls.startLine, character: cls.endColumn || (cls.startColumn || 0) + 1 },
  };
}

const repoPatterns = ['Repository', 'Dao', 'DAO', 'Persistence', 'PersistenceImpl', 'RepositoryImpl'];
const servicePatterns = ['Service', 'Manager', 'Handler'];
const infraPatterns = ['Client', 'Gateway', 'Connector', 'Producer', 'Consumer'];
const entityPatterns = ['Entity'];

function stripGenerics(t) { return t.replace(/<.*>/g, '').replace(/\[\]/g, '').trim(); }
function isRepositoryType(t) { return repoPatterns.some(p => stripGenerics(t).endsWith(p)); }
function isServiceType(t) { return servicePatterns.some(p => stripGenerics(t).endsWith(p)); }
function isRepositoryName(n) { return repoPatterns.some(p => n.endsWith(p)); }
function isServiceName(n) { return servicePatterns.some(p => n.endsWith(p)); }
function isInfrastructureName(n) { return infraPatterns.some(p => n.endsWith(p)); }

const LAYER_CACHE = {};
function resolveClassLayer(fqcn) {
  if (LAYER_CACHE[fqcn]) return LAYER_CACHE[fqcn];
  for (const ast of Object.values(state.files)) {
    for (const cls of ast.classes || []) {
      if (cls.fullyQualifiedName === fqcn || cls.className === fqcn) {
        LAYER_CACHE[fqcn] = cls.detectedLayer || 'unknown';
        return LAYER_CACHE[fqcn];
      }
    }
  }
  const simple = fqcn.split('.').pop() || fqcn;
  if (servicePatterns.some(p => simple.endsWith(p))) return 'service';
  if (repoPatterns.some(p => simple.endsWith(p))) return 'repository';
  if (entityPatterns.some(p => simple.endsWith(p))) return 'entity';
  return 'unknown';
}

const HINT_MAP = {
  'self-instantiation': 'Use dependency injection instead of directly instantiating with new()',
  'uninjected-repository-access': 'Annotate the field with @Autowired or use constructor injection',
  'uninjected-service-access': 'Annotate the field with @Autowired or use constructor injection',
  'anemic-entity': 'Add behavior to the entity instead of keeping it as a pure data holder',
  'direct-service-instantiation': 'Inject the Service via constructor instead of instantiating it',
};

function getHint(type) {
  return HINT_MAP[type] || 'Review the architectural guidelines for this layer';
}

// ─── REST Endpoints ──────────────────────────────────────────────────────────

// Receive full project AST from extension
app.post('/ast/full', (req, res) => {
  try {
    const { files, projectName, timestamp } = req.body;
    if (files) {
      state.files = { ...state.files, ...files };
      LAYER_CACHE.length = 0;
      Object.keys(LAYER_CACHE).forEach(k => delete LAYER_CACHE[k]);
      buildGraph();
      state.violations = detectLocalViolations();
      state.history.push({ event: 'full-sync', timestamp: timestamp || Date.now(), fileCount: Object.keys(files).length });
      if (state.history.length > 100) state.history.shift();
    }
    res.json({ status: 'ok', fileCount: Object.keys(state.files).length, violations: state.violations.length });
  } catch (err) {
    console.error('POST /ast/full error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Receive single file change from extension
app.post('/ast/change', (req, res) => {
  try {
    const { changeType, filePath, ast, timestamp } = req.body;
    if (changeType === 'deleted' || changeType === 'renamed') {
      delete state.files[filePath];
      if (req.body.oldFilePath) delete state.files[req.body.oldFilePath];
    } else if (ast) {
      state.files[filePath] = ast;
    }
    LAYER_CACHE.length = 0;
    Object.keys(LAYER_CACHE).forEach(k => delete LAYER_CACHE[k]);
    buildGraph();
    state.violations = detectLocalViolations();
    state.history.push({ event: changeType, filePath, timestamp: timestamp || Date.now() });
    if (state.history.length > 100) state.history.shift();
    res.json({ status: 'ok', fileCount: Object.keys(state.files).length, violations: state.violations.length });
  } catch (err) {
    console.error('POST /ast/change error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Reset all data
app.post('/ast/reset', (req, res) => {
  state.files = {};
  state.graph = { nodes: [], edges: [] };
  state.violations = [];
  LAYER_CACHE.length = 0;
  Object.keys(LAYER_CACHE).forEach(k => delete LAYER_CACHE[k]);
  res.json({ status: 'ok' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', fileCount: Object.keys(state.files).length, violations: state.violations.length });
});

// ─── Phase 7: Public REST API ────────────────────────────────────────────────

app.get('/api/v1/violations', (req, res) => {
  try {
    const { severity, source } = req.query;
    let data = state.violations;
    if (severity) data = data.filter(v => v.severity === severity);
    if (source) data = data.filter(v => v.detectorSource === source);

    const summary = { total: data.length, errors: 0, warnings: 0, info: 0 };
    for (const v of data) {
      if (v.severity === 'error') summary.errors++;
      else if (v.severity === 'warning') summary.warnings++;
      else summary.info++;
    }

    res.json({ summary, violations: data });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/v1/graph', (req, res) => {
  try {
    res.json(state.graph);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/v1/stats', (req, res) => {
  try {
    const fileCount = Object.keys(state.files).length;
    const nodeCount = state.graph.nodes.length;
    const edgeCount = state.graph.edges.length;
    const layerBreakdown = {};
    for (const n of state.graph.nodes) {
      layerBreakdown[n.layer] = (layerBreakdown[n.layer] || 0) + 1;
    }
    res.json({
      files: fileCount,
      nodes: nodeCount,
      edges: edgeCount,
      violations: state.violations.length,
      layers: layerBreakdown,
      historyLength: state.history.length,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/v1/history', (req, res) => {
  res.json({ history: state.history.slice(-50) });
});

// ─── Serve Visualizer Dashboard ──────────────────────────────────────────────

app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`[RICA Engine] Architectural Observatory running on http://localhost:${PORT}`);
  console.log(`[RICA Engine] API:    http://localhost:${PORT}/api/v1`);
  console.log(`[RICA Engine] Viewer: http://localhost:${PORT}/view`);
});
