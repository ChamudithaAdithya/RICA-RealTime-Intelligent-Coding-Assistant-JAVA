/**
 * Verify the three Java test projects via deterministic RICA analyzers (no AI).
 * Usage: node scripts/verify-test-projects.js
 */
const fs = require('fs');
const path = require('path');

const { JavaParser } = require('../src/infrastructure/javaParser');
const { DesignPatternAnalyzer } = require('../src/designPatternAnalyzer');
const { buildGraphFromFiles } = require('../src/dependencyGraph');
const { CrossFileAnalyzer } = require('../src/crossFileAnalyzer');
const { PackageBoundaryAnalyzer } = require('../src/packageBoundaryDetector');
const { ServiceLayerAnalyzer } = require('../src/serviceLayerDetector');
const { ControllerLayerAnalyzer } = require('../src/controllerLayerDetector');
const { EntityLayerAnalyzer } = require('../src/entityLayerDetector');
const { APIResourceLayerAnalyzer } = require('../src/apiResourceLayerDetector');
const { VIOLATION_DOC_BY_CODE } = require('../src/violationCatalog');

const parser = new JavaParser({ appendLine: () => {} });

const LAYER_RULE_CODES = {
  'self-instantiation': 'RICA-V101',
  'uninjected-repository-access': 'RICA-V102',
  'uninjected-service-access': 'RICA-V103',
  'anemic-service': 'RICA-V104',
  'business-logic': 'RICA-V106',
  'direct-layer-access': 'RICA-V107',
  'anemic-entity': 'RICA-V108',
  'improper-data-access': 'RICA-V109',
  'direct-http-call': 'RICA-V110',
  'file-io': 'RICA-V111',
  'background-thread': 'RICA-V112',
  'static-cache': 'RICA-V113',
  'raw-sql-access': 'RICA-V114',
  'exposing-internal-entity': 'RICA-V201',
  'missing-dto-usage': 'RICA-V202',
  'improper-error-handling': 'RICA-V203',
  'business-logic-in-resource': 'RICA-V204',
  'direct-service-instantiation': 'RICA-V205',
  'missing-validation': 'RICA-V206',
  'exposing-internal-structure': 'RICA-V207',
};

const EXPECTED_CODES = Object.keys(VIOLATION_DOC_BY_CODE)
  .filter(code => /^RICA-V\d{3}$/.test(code))
  .filter(code => !['RICA-V000', 'RICA-V300', 'RICA-V400'].includes(code))
  .sort();

function findJava(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const fp = path.join(dir, entry);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      out.push(...findJava(fp));
    } else if (fp.endsWith('.java')) {
      out.push(fp);
    }
  }
  return out;
}

function countCodes(violations) {
  const byCode = {};
  for (const violation of violations) {
    const code = violation.code || LAYER_RULE_CODES[violation.type] || 'RICA-V000';
    byCode[code] = (byCode[code] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(byCode).sort(([a], [b]) => a.localeCompare(b)));
}

function layerCodeViolations(violations, detectorSource) {
  return violations.map(v => ({
    ...v,
    code: LAYER_RULE_CODES[v.type] || 'RICA-V000',
    detectorSource,
  }));
}

function analyze(root) {
  const files = findJava(root);
  const map = {};
  const asts = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const ast = parser.parse(source, rel);
    map[rel] = ast;
    asts.push(ast);
  }

  const graph = buildGraphFromFiles(map);
  const design = new DesignPatternAnalyzer().analyze(asts, graph, map);
  const crossFile = new CrossFileAnalyzer().analyze(graph, map);

  let packageBoundary = [];
  try {
    const analyzer = new PackageBoundaryAnalyzer();
    packageBoundary = analyzer.toUnifiedViolations(analyzer.analyze(asts, graph, new Map()));
  } catch (err) {
    console.warn(`Package-boundary analysis failed for ${root}: ${err.message}`);
  }

  const service = new ServiceLayerAnalyzer().analyze(asts);
  const controller = new ControllerLayerAnalyzer().analyze(asts);
  const entity = new EntityLayerAnalyzer().analyze(asts);
  const api = new APIResourceLayerAnalyzer().analyze(asts);
  const layer = [
    ...layerCodeViolations(service, 'ServiceLayer'),
    ...layerCodeViolations(controller, 'ControllerLayer'),
    ...layerCodeViolations(entity, 'EntityLayer'),
    ...layerCodeViolations(api, 'APIResourceLayer'),
  ];
  const all = [...layer, ...design, ...crossFile, ...packageBoundary];

  return {
    files: asts.length,
    counts: {
      layer: layer.length,
      design: design.length,
      crossFile: crossFile.length,
      packageBoundary: packageBoundary.length,
      total: all.length,
    },
    byCode: countCodes(all),
  };
}

let failed = false;
const covered = new Set();

for (const project of ['rica-clean', 'rica-violations-heavy', 'rica-structural']) {
  const root = path.join(__dirname, '..', '..', 'test-projects', project);
  console.log(`\n=== ${project} ===`);
  const result = analyze(root);
  console.log(
    'Files:', result.files,
    'Layer:', result.counts.layer,
    'DP:', result.counts.design,
    'CF:', result.counts.crossFile,
    'PB:', result.counts.packageBoundary,
    'Total:', result.counts.total,
  );
  console.log('ByCode:', result.byCode);

  if (project === 'rica-clean') {
    if (result.counts.total !== 0) {
      failed = true;
      console.error(`Expected rica-clean to have 0 violations, found ${result.counts.total}.`);
    }
  } else {
    for (const code of Object.keys(result.byCode)) {
      covered.add(code);
    }
  }
}

const missing = EXPECTED_CODES.filter(code => !covered.has(code));
if (missing.length > 0) {
  failed = true;
  console.error(`\nMissing expected rule coverage: ${missing.join(', ')}`);
}

if (failed) {
  process.exit(1);
}

console.log('\nAll expected deterministic rules are covered by the violation test projects.');
