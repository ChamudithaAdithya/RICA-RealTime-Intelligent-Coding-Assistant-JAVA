"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const javaParser_1 = require("./src/javaParser");
const projectAnalyzer_1 = require("./src/projectAnalyzer");
const serviceLayerDetector_1 = require("./src/serviceLayerDetector");
const controllerLayerDetector_1 = require("./src/controllerLayerDetector");
const entityLayerDetector_1 = require("./src/entityLayerDetector");
const apiResourceLayerDetector_1 = require("./src/apiResourceLayerDetector");

const outputChannel = { appendLine: () => {} };
const parser = new javaParser_1.JavaParser(outputChannel);

const projectPath = "D:\\RICA\\Project\\Library_Management_System-main\\src";
const javaFiles = [];

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(fullPath);
        else if (entry.name.endsWith('.java')) javaFiles.push(fullPath);
    }
}
walkDir(projectPath);
console.log(`Found ${javaFiles.length} Java files\n`);

const parsedFiles = {};
const allAsts = [];

for (const filePath of javaFiles) {
    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(projectPath, filePath);
        const ast = parser.parse(code, relPath);
        parsedFiles[relPath] = ast;
        allAsts.push(ast);
        const clsInfo = ast.classes.map(c => `${c.className}(${c.detectedLayer})`).join(', ');
        console.log(`  ${relPath} → ${clsInfo || '(no classes)'}`);
    } catch (e) {
        console.log(`  FAIL: ${filePath} — ${e.message}`);
    }
}

console.log('\n=== LAYER DETECTOR VIOLATIONS ===');
const allViolations = [];

// Run each layer detector
const serviceAnalyzer = new serviceLayerDetector_1.ServiceLayerAnalyzer();
const ctrlAnalyzer = new controllerLayerDetector_1.ControllerLayerAnalyzer();
const entityAnalyzer = new entityLayerDetector_1.EntityLayerAnalyzer();
const apiAnalyzer = new apiResourceLayerDetector_1.APIResourceLayerAnalyzer();

const sv = serviceAnalyzer.analyze(allAsts);
const cv = ctrlAnalyzer.analyze(allAsts);
const ev = entityAnalyzer.analyze(allAsts);
const av = apiAnalyzer.analyze(allAsts);

for (const v of sv) console.log(`  [ServiceLayer][${v.severity}] ${v.message}${v.lineNumber ? ' line:'+v.lineNumber : ''}`);
for (const v of cv) console.log(`  [ControllerLayer][${v.severity}] ${v.message}${v.lineNumber ? ' line:'+v.lineNumber : ''}`);
for (const v of ev) console.log(`  [EntityLayer][${v.severity}] ${v.message}${v.lineNumber ? ' line:'+v.lineNumber : ''}`);
for (const v of av) console.log(`  [APIResourceLayer][${v.severity}] ${v.message}${v.lineNumber ? ' line:'+v.lineNumber : ''}`);

console.log(`\nTotal detector violations: ${sv.length + cv.length + ev.length + av.length}`);

// Run graph-based analysis
console.log('\n=== GRAPH-BASED CROSS-FILE VIOLATIONS ===');
const projectOutput = {
    projectName: 'Library Management System',
    workspacePath: projectPath,
    timestamp: Date.now(),
    files: parsedFiles,
    relationships: [],
    totalFiles: Object.keys(parsedFiles).length
};

const report = (0, projectAnalyzer_1.analyzeProject)(projectOutput);
console.log((0, projectAnalyzer_1.formatReport)(report));

// Layer classification summary
console.log('=== LAYER CLASSIFICATION SUMMARY ===');
const layers = {};
for (const [, ast] of Object.entries(parsedFiles)) {
    for (const cls of ast.classes) {
        const l = cls.detectedLayer || 'unknown';
        if (!layers[l]) layers[l] = [];
        layers[l].push(cls.className);
    }
}
for (const [layer, names] of Object.entries(layers)) {
    console.log(`  ${layer}: ${names.join(', ')}`);
}
