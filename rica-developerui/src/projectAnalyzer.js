"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProject = analyzeProject;
exports.formatReport = formatReport;
const dependencyGraph_1 = require("./dependencyGraph");
const defaultRules = [
    dependencyGraph_1.controllerBypassRule,
    dependencyGraph_1.cyclicDependencyRule,
    dependencyGraph_1.entityExposureRule,
    dependencyGraph_1.crossLayerViolationRule,
];
function analyzeProject(projectOutput, customRules) {
    const files = projectOutput.files;
    const rules = customRules || defaultRules;
    const graph = (0, dependencyGraph_1.buildGraphFromFiles)(files);
    const allViolations = [];
    for (const rule of rules) {
        const ruleViolations = rule.analyze(graph, files);
        allViolations.push(...ruleViolations);
    }
    const classCount = Array.from(graph.nodes.values())
        .filter(n => n.type === 'class').length;
    return {
        projectName: projectOutput.projectName,
        timestamp: Date.now(),
        totalFiles: projectOutput.totalFiles,
        totalClasses: classCount,
        totalEdges: graph.edges.length,
        totalNodes: graph.nodes.size,
        violations: allViolations,
        graph
    };
}
function formatReport(report) {
    const lines = [];
    lines.push(`=== Architecture Analysis Report ===`);
    lines.push(`Project: ${report.projectName}`);
    lines.push(`Files: ${report.totalFiles}, Classes: ${report.totalClasses}, Nodes: ${report.totalNodes}, Edges: ${report.totalEdges}`);
    lines.push(`Violations Found: ${report.violations.length}`);
    lines.push('');
    if (report.violations.length === 0) {
        lines.push('No architectural violations detected.');
        return lines.join('\n');
    }
    const bySeverity = (sev) => report.violations.filter(v => v.severity === sev);
    const errors = bySeverity('error');
    const warnings = bySeverity('warning');
    const infos = bySeverity('info');
    if (errors.length > 0) {
        lines.push(`--- ERRORS (${errors.length}) ---`);
        for (const v of errors) {
            lines.push(`  [${v.ruleId}] ${v.message}`);
            if (v.filePath)
                lines.push(`         File: ${v.filePath}${v.line ? `:${v.line}` : ''}`);
        }
        lines.push('');
    }
    if (warnings.length > 0) {
        lines.push(`--- WARNINGS (${warnings.length}) ---`);
        for (const v of warnings) {
            lines.push(`  [${v.ruleId}] ${v.message}`);
            if (v.filePath)
                lines.push(`         File: ${v.filePath}${v.line ? `:${v.line}` : ''}`);
        }
        lines.push('');
    }
    if (infos.length > 0) {
        lines.push(`--- INFO (${infos.length}) ---`);
        for (const v of infos) {
            lines.push(`  [${v.ruleId}] ${v.message}`);
            if (v.filePath)
                lines.push(`         File: ${v.filePath}${v.line ? `:${v.line}` : ''}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
//# sourceMappingURL=projectAnalyzer.js.map