"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const javaParser_1 = require("../../dist/javaParser");
const projectAnalyzer_1 = require("../../dist/analyzers/projectAnalyzer");
const serviceLayerDetector_1 = require("../../dist/analyzers/serviceLayerDetector");
const controllerLayerDetector_1 = require("../../dist/analyzers/controllerLayerDetector");
const entityLayerDetector_1 = require("../../dist/analyzers/entityLayerDetector");
const apiResourceLayerDetector_1 = require("../../dist/analyzers/apiResourceLayerDetector");
const crossFileAnalyzer_1 = require("../../dist/analyzers/crossFileAnalyzer");
const dependencyGraph_1 = require("../../dist/core/dependencyGraph");

const outputChannel = { appendLine: () => {} };
const parser = new javaParser_1.JavaParser(outputChannel);

const projectPath = "E:\\DevMyX\\Simlea Web\\backend";
const javaFiles = [];

function walkDir(dir) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'target') {
                    walkDir(fullPath);
                }
            } else if (entry.name.endsWith('.java')) {
                javaFiles.push(fullPath);
            }
        }
    } catch (e) { /* permission denied etc */ }
}
walkDir(projectPath);
console.log(`Found ${javaFiles.length} Java files\n`);

const parsedFiles = {};
const allAsts = [];
let parseErrors = 0;

for (const filePath of javaFiles) {
    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(projectPath, filePath);
        const ast = parser.parse(code, relPath);
        parsedFiles[relPath] = ast;
        allAsts.push(ast);
    } catch (e) {
        parseErrors++;
    }
}

console.log(`Parsed ${Object.keys(parsedFiles).length} files (${parseErrors} errors)\n`);

console.log('=== LAYER CLASSIFICATION ===');
const layerCounts = {};
for (const [, ast] of Object.entries(parsedFiles)) {
    for (const cls of ast.classes) {
        const l = cls.detectedLayer || 'unknown';
        if (!layerCounts[l]) layerCounts[l] = 0;
        layerCounts[l]++;
    }
}
for (const [layer, count] of Object.entries(layerCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${layer}: ${count}`);
}

console.log('\n=== SINGLE-FILE DETECTOR VIOLATIONS ===');
const allViolations = [];

const serviceAnalyzer = new serviceLayerDetector_1.ServiceLayerAnalyzer();
const ctrlAnalyzer = new controllerLayerDetector_1.ControllerLayerAnalyzer();
const entityAnalyzer = new entityLayerDetector_1.EntityLayerAnalyzer();
const apiAnalyzer = new apiResourceLayerDetector_1.APIResourceLayerAnalyzer();

const sv = serviceAnalyzer.analyze(allAsts);
const cv = ctrlAnalyzer.analyze(allAsts);
const ev = entityAnalyzer.analyze(allAsts);
const av = apiAnalyzer.analyze(allAsts);

const severityCounts = { error: 0, warning: 0, info: 0 };
for (const v of [...sv, ...cv, ...ev, ...av]) {
    severityCounts[v.severity]++;
    if (!severityCounts[v.type]) severityCounts[v.type] = 0;
    severityCounts[v.type] = (severityCounts[v.type] || 0) + 1;
}

console.log(`  ServiceLayer: ${sv.length}`);
console.log(`  ControllerLayer: ${cv.length}`);
console.log(`  EntityLayer: ${ev.length}`);
console.log(`  APIResourceLayer: ${av.length}`);
console.log(`  Total: ${sv.length + cv.length + ev.length + av.length}`);
console.log(`  By severity: ${severityCounts.error} errors, ${severityCounts.warning} warnings, ${severityCounts.info} info`);

// Top violation types
console.log('\n=== VIOLATION TYPE BREAKDOWN ===');
const typeCounts = {};
for (const v of [...sv, ...cv, ...ev, ...av]) {
    if (!typeCounts[v.type]) typeCounts[v.type] = 0;
    typeCounts[v.type]++;
}
for (const [type, count] of Object.entries(typeCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${type}: ${count}`);
}

console.log('\n=== GRAPH-BASED CROSS-FILE VIOLATIONS ===');
const projectOutput = {
    projectName: 'Simlea Backend',
    workspacePath: projectPath,
    timestamp: Date.now(),
    files: parsedFiles,
    relationships: [],
    totalFiles: Object.keys(parsedFiles).length
};

const report = (0, projectAnalyzer_1.analyzeProject)(projectOutput);
console.log((0, projectAnalyzer_1.formatReport)(report));

console.log('\n=== WORST-OFFENDING FILES ===');
const fileViolations = {};
for (const v of [...sv, ...cv, ...ev, ...av]) {
    if (v.filePath) {
        if (!fileViolations[v.filePath]) fileViolations[v.filePath] = 0;
        fileViolations[v.filePath]++;
    }
}
const sorted = Object.entries(fileViolations).sort((a,b) => b[1]-a[1]).slice(0, 15);
for (const [file, count] of sorted) {
    console.log(`  ${count} violations: ${file}`);
}
