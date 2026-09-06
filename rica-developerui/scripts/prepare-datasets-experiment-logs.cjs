const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { JavaParser } = require('../dist/infrastructure/javaParser');
const { DesignPatternAnalyzer } = require('../dist/analyzers/designPatternAnalyzer');
const { buildGraphFromFiles } = require('../dist/core/dependencyGraph');
const { CrossFileAnalyzer } = require('../dist/analyzers/crossFileAnalyzer');
const { PackageBoundaryAnalyzer } = require('../dist/analyzers/packageBoundaryDetector');
const { ServiceLayerAnalyzer } = require('../dist/analyzers/serviceLayerDetector');
const { ControllerLayerAnalyzer } = require('../dist/analyzers/controllerLayerDetector');
const { EntityLayerAnalyzer } = require('../dist/analyzers/entityLayerDetector');
const { APIResourceLayerAnalyzer } = require('../dist/analyzers/apiResourceLayerDetector');

const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(root, '..');
const packageRoot = path.join(root, 'outputs', 'final-submission', 'RICA_Final_Submission_11553', '04_Datasets_And_Experiment_Logs');
const sourceProjectsRoot = path.join(repoRoot, 'test-projects');
const projects = ['rica-clean', 'rica-violations-heavy', 'rica-structural'];

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

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function findJava(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const fp = path.join(dir, entry);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) out.push(...findJava(fp));
    else if (fp.endsWith('.java')) out.push(fp);
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

function normalizeLayerViolations(violations, detectorSource) {
  return violations.map(v => ({
    ...v,
    code: LAYER_RULE_CODES[v.type] || 'RICA-V000',
    detectorSource,
  }));
}

function analyzeProject(projectName, snapshotRoot) {
  const parser = new JavaParser({ appendLine: () => {} });
  const projectRoot = path.join(sourceProjectsRoot, projectName);
  const files = findJava(projectRoot);
  const map = {};
  const asts = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
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
    packageBoundary = [{ code: 'RICA-V000', severity: 'warning', message: `Package-boundary analysis failed: ${err.message}` }];
  }

  const layer = [
    ...normalizeLayerViolations(new ServiceLayerAnalyzer().analyze(asts), 'ServiceLayer'),
    ...normalizeLayerViolations(new ControllerLayerAnalyzer().analyze(asts), 'ControllerLayer'),
    ...normalizeLayerViolations(new EntityLayerAnalyzer().analyze(asts), 'EntityLayer'),
    ...normalizeLayerViolations(new APIResourceLayerAnalyzer().analyze(asts), 'APIResourceLayer'),
  ];

  const violations = [...layer, ...design, ...crossFile, ...packageBoundary];
  const projectSnapshotRoot = path.join(snapshotRoot, projectName);
  fs.mkdirSync(projectSnapshotRoot, { recursive: true });
  fs.writeFileSync(path.join(projectSnapshotRoot, 'all-asts.json'), JSON.stringify(map, null, 2));
  fs.writeFileSync(path.join(projectSnapshotRoot, 'dependency-graph.json'), JSON.stringify({
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
  }, null, 2));
  fs.writeFileSync(path.join(projectSnapshotRoot, 'violations.json'), JSON.stringify(violations, null, 2));
  fs.writeFileSync(path.join(projectSnapshotRoot, 'stats.json'), JSON.stringify({
    project: projectName,
    files: asts.length,
    counts: {
      layer: layer.length,
      design: design.length,
      crossFile: crossFile.length,
      packageBoundary: packageBoundary.length,
      total: violations.length,
    },
    byCode: countCodes(violations),
  }, null, 2));

  return JSON.parse(fs.readFileSync(path.join(projectSnapshotRoot, 'stats.json'), 'utf8'));
}

function createTerminalPng(title, command, logFile, imageFile) {
  const psScript = `
Add-Type -AssemblyName System.Drawing
$title = ${JSON.stringify(title)}
$command = ${JSON.stringify(command)}
$logFile = ${JSON.stringify(logFile)}
$imageFile = ${JSON.stringify(imageFile)}
$lines = Get-Content -LiteralPath $logFile
if ($command -eq "npm run test:projects") {
  $lines = $lines | Where-Object { $_ -match "^=== " -or $_ -match "^Files:" -or $_ -match "^All expected" }
  $lines = @("Detailed rule-code counts are saved in test-projects-output.txt and analysis-snapshot/stats.json.", "") + $lines
}
if ($lines.Count -gt 42) { $lines = $lines[($lines.Count - 42)..($lines.Count - 1)] }
$bitmap = New-Object System.Drawing.Bitmap 1600, 1000
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#0F172A"))
$titleFont = New-Object System.Drawing.Font "Segoe UI", 28, ([System.Drawing.FontStyle]::Bold)
$cmdFont = New-Object System.Drawing.Font "Consolas", 18, ([System.Drawing.FontStyle]::Bold)
$mono = New-Object System.Drawing.Font "Consolas", 16
$brushTitle = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F8FAFC"))
$brushCmd = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7DD3FC"))
$brushText = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#E5E7EB"))
$brushPanel = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#111827"))
$pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#334155"), 2)
$g.DrawString($title, $titleFont, $brushTitle, 48, 34)
$g.DrawString("> " + $command, $cmdFont, $brushCmd, 52, 92)
$g.FillRectangle($brushPanel, 48, 140, 1504, 805)
$g.DrawRectangle($pen, 48, 140, 1504, 805)
$y = 166
foreach ($line in $lines) {
  $safe = if ($line.Length -gt 142) { $line.Substring(0, 139) + "..." } else { $line }
  $g.DrawString($safe, $mono, $brushText, 72, $y)
  $y += 18
  if ($y -gt 920) { break }
}
$bitmap.Save($imageFile, [System.Drawing.Imaging.ImageFormat]::Png)
$pen.Dispose(); $brushPanel.Dispose(); $brushText.Dispose(); $brushCmd.Dispose(); $brushTitle.Dispose()
$mono.Dispose(); $cmdFont.Dispose(); $titleFont.Dispose(); $g.Dispose(); $bitmap.Dispose()
`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' });
}

function main() {
  fs.mkdirSync(packageRoot, { recursive: true });

  const testProjectsDest = path.join(packageRoot, 'test-projects');
  ensureCleanDir(testProjectsDest);
  for (const project of projects) {
    fs.cpSync(path.join(sourceProjectsRoot, project), path.join(testProjectsDest, project), {
      recursive: true,
      force: true,
      filter: source => !source.includes(`${path.sep}target${path.sep}`) && !source.endsWith('.class'),
    });
  }

  const snapshotRoot = path.join(packageRoot, 'analysis-snapshot');
  ensureCleanDir(snapshotRoot);
  const stats = projects.map(project => analyzeProject(project, snapshotRoot));
  fs.writeFileSync(path.join(snapshotRoot, 'stats.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'RICA deterministic analyzer over controlled Java test projects',
    projects: stats,
  }, null, 2));
  fs.writeFileSync(path.join(snapshotRoot, 'README.md'), [
    '# RICA Analysis Snapshot Evidence',
    '',
    'This folder contains exported analyzer evidence for the three controlled Java test projects.',
    '',
    '- `all-asts.json`: AST/fact output generated from Java source files.',
    '- `dependency-graph.json`: graph nodes and relationship edges used by graph rules.',
    '- `violations.json`: detected violations for the project.',
    '- `stats.json`: file counts, detector counts, totals, and rule-code counts.',
    '',
    'The VS Code extension also supports exporting a workspace snapshot through `Java AST: Export Analysis Snapshot` after analyzing a project.',
  ].join('\n'));

  const npmLog = path.join(packageRoot, 'npm-test-output.txt');
  const projectLog = path.join(packageRoot, 'test-projects-output.txt');
  if (fs.existsSync(npmLog)) {
    createTerminalPng('Automated Test Execution Output', 'npm test', npmLog, path.join(packageRoot, 'npm-test-output.png'));
  }
  if (fs.existsSync(projectLog)) {
    createTerminalPng('Controlled Test Project Analysis Output', 'npm run test:projects', projectLog, path.join(packageRoot, 'test-projects-output.png'));
  }

  fs.writeFileSync(path.join(packageRoot, 'README.md'), [
    '# 04_Datasets_And_Experiment_Logs',
    '',
    'This folder contains the controlled Java test projects and experiment evidence used for the RICA final submission.',
    '',
    '## Contents',
    '',
    '- `test-projects/`: copied controlled Java fixtures (`rica-clean`, `rica-violations-heavy`, `rica-structural`).',
    '- `npm-test-output.txt` and `npm-test-output.png`: automated test evidence.',
    '- `test-projects-output.txt` and `test-projects-output.png`: controlled project analysis evidence.',
    '- `analysis-snapshot/`: AST, dependency graph, violation, and statistics evidence exported from deterministic analysis.',
    '',
    '## Latest Observed Results',
    '',
    ...stats.map(s => `- ${s.project}: ${s.files} files, ${s.counts.total} total violations.`),
  ].join('\n'));

  console.log(`Prepared ${packageRoot}`);
}

main();
