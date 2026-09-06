"use strict";

const fs = require("fs");
const path = require("path");

const { JavaParser } = require("../../dist/javaParser");
const { ServiceLayerAnalyzer } = require("../../dist/analyzers/serviceLayerDetector");
const { ControllerLayerAnalyzer } = require("../../dist/analyzers/controllerLayerDetector");
const { EntityLayerAnalyzer } = require("../../dist/analyzers/entityLayerDetector");
const { APIResourceLayerAnalyzer } = require("../../dist/analyzers/apiResourceLayerDetector");
const { DesignPatternAnalyzer } = require("../../dist/analyzers/designPatternAnalyzer");
const { PackageBoundaryAnalyzer } = require("../../dist/analyzers/packageBoundaryDetector");
const { CrossFileAnalyzer } = require("../../dist/analyzers/crossFileAnalyzer");
const { buildGraphFromFiles } = require("../../dist/core/dependencyGraph");

const [projectRootArg, outputDirArg] = process.argv.slice(2);

if (!projectRootArg) {
  console.error("Usage: node scripts/manual/analyze-java-project.js <project-root> [output-dir]");
  process.exit(1);
}

const projectRoot = path.resolve(projectRootArg);
const outputDir = path.resolve(outputDirArg || path.join("outputs", "evaluation", "manual-project-analysis"));
const parser = new JavaParser({ appendLine: () => {} });

const LAYER_RULE_CODES = {
  "self-instantiation": "RICA-V101",
  "uninjected-repository-access": "RICA-V102",
  "uninjected-service-access": "RICA-V103",
  "anemic-service": "RICA-V104",
  "business-logic": "RICA-V106",
  "direct-layer-access": "RICA-V107",
  "anemic-entity": "RICA-V108",
  "improper-data-access": "RICA-V109",
  "direct-http-call": "RICA-V110",
  "file-io": "RICA-V111",
  "background-thread": "RICA-V112",
  "static-cache": "RICA-V113",
  "raw-sql-access": "RICA-V114",
  "exposing-internal-entity": "RICA-V201",
  "missing-dto-usage": "RICA-V202",
  "improper-error-handling": "RICA-V203",
  "business-logic-in-resource": "RICA-V204",
  "direct-service-instantiation": "RICA-V205",
  "missing-validation": "RICA-V206",
  "exposing-internal-structure": "RICA-V207",
};

function walkJavaFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ["node_modules", "target", "build", "dist", "out"].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJavaFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".java")) {
      files.push(fullPath);
    }
  }
  return files;
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, rows) {
  const headers = ["type", "code", "severity", "filePath", "lineNumber", "className", "methodName", "message"];
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(",")),
  ].join("\r\n");
  fs.writeFileSync(filePath, csv, "utf8");
}

function normalizeViolation(violation) {
  const type = violation.type || violation.ruleName || violation.ruleId || "";
  return {
    type,
    code: violation.code || violation.ruleId || LAYER_RULE_CODES[type] || "",
    severity: violation.severity || "",
    filePath: violation.filePath || "",
    lineNumber: violation.lineNumber || violation.line || "",
    className: violation.className || violation.sourceId || "",
    methodName: violation.methodName || "",
    message: violation.message || "",
    evidence: violation.analysisMetadata?.evidence || "",
    reason: violation.analysisMetadata?.reason || violation.explanation || "",
  };
}

fs.mkdirSync(outputDir, { recursive: true });

const javaFiles = walkJavaFiles(projectRoot);
const parsedFiles = {};
const asts = [];
let parseErrors = 0;

for (const file of javaFiles) {
  const relativePath = path.relative(projectRoot, file);
  try {
    const source = fs.readFileSync(file, "utf8");
    const ast = parser.parse(source, relativePath);
    parsedFiles[relativePath] = ast;
    asts.push(ast);
  } catch (error) {
    parseErrors++;
  }
}

const graph = buildGraphFromFiles(parsedFiles);
const classAnnotations = new Map();
for (const ast of asts) {
  for (const cls of ast.classes || []) {
    classAnnotations.set(cls.fullyQualifiedName || cls.className, (cls.annotations || []).map(annotation => annotation.name));
  }
}

const packageBoundaryAnalyzer = new PackageBoundaryAnalyzer();
const violations = [
  ...new ServiceLayerAnalyzer().analyze(asts),
  ...new ControllerLayerAnalyzer().analyze(asts),
  ...new EntityLayerAnalyzer().analyze(asts),
  ...new APIResourceLayerAnalyzer().analyze(asts),
  ...new DesignPatternAnalyzer().analyze(asts, graph, parsedFiles),
  ...new CrossFileAnalyzer().analyze(graph, parsedFiles),
  ...packageBoundaryAnalyzer.toUnifiedViolations(packageBoundaryAnalyzer.analyze(asts, graph, classAnnotations)),
].map(normalizeViolation);

const summary = {
  projectRoot,
  analyzedFiles: javaFiles.length,
  parsedFiles: asts.length,
  parseErrors,
  totalFindings: violations.length,
  byType: countBy(violations, v => v.type),
  byCode: countBy(violations, v => v.code),
  bySeverity: countBy(violations, v => v.severity),
};

fs.writeFileSync(path.join(outputDir, "findings.json"), JSON.stringify(violations, null, 2), "utf8");
writeCsv(path.join(outputDir, "findings.csv"), violations);
fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

console.log(`Analyzed files: ${summary.analyzedFiles}`);
console.log(`Parsed files: ${summary.parsedFiles}`);
console.log(`Parse errors: ${summary.parseErrors}`);
console.log(`Total findings: ${summary.totalFindings}`);
console.log(`Output: ${outputDir}`);
console.log("By type:", summary.byType);
console.log("By severity:", summary.bySeverity);
