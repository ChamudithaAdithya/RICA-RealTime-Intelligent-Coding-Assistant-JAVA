"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossFileAnalyzer = void 0;
exports.buildCrossFileAnalyzer = buildCrossFileAnalyzer;
const dependencyGraph_1 = require("./dependencyGraph");
const violationCatalog_1 = require("./violationCatalog");
const CROSS_FILE_CODE_MAP = {
    'LAYER_BYPASS': 'RICA-V401',
    'CROSS_LAYER': 'RICA-V402',
    'CYCLIC_DEP': 'RICA-V403',
    'ENTITY_EXPOSURE': 'RICA-V404',
};
function toUnifiedViolation(gv, ruleId, ruleName, mitigationHint) {
    return {
        id: gv.ruleId ? `${gv.ruleId}-${gv.filePath}-${gv.line || 0}` : `${ruleId}-${gv.filePath}-${gv.line || 0}`,
        code: CROSS_FILE_CODE_MAP[ruleId] || 'RICA-V400',
        ruleName,
        severity: gv.severity,
        message: gv.message,
        filePath: gv.filePath,
        lineNumber: gv.line,
        contextMetadata: {
            targetComponent: gv.targetId,
            layerInvolved: gv.layerContext,
        },
        explanation: gv.explanation || undefined,
        mitigationHint,
        documentationUrl: (0, violationCatalog_1.violationDocSlug)(CROSS_FILE_CODE_MAP[ruleId]),
        detectorSource: 'CrossFileAnalyzer',
    };
}
function toUnifiedFromEdge(graph, sourceId, targetId, edgeType, ruleId, ruleName, severity, message, mitigationHint, filePath, line, layerContext, explanation) {
    return {
        id: `${ruleId}-${sourceId}-${targetId}`,
        code: CROSS_FILE_CODE_MAP[ruleId] || 'RICA-V400',
        ruleName,
        severity,
        message,
        filePath: filePath || '',
        lineNumber: line,
        contextMetadata: {
            targetComponent: targetId,
            layerInvolved: layerContext,
        },
        explanation: explanation || 'A dependency edge violates architectural rules based on edge type and layer constraints.',
        mitigationHint,
        documentationUrl: (0, violationCatalog_1.violationDocSlug)(CROSS_FILE_CODE_MAP[ruleId]),
        detectorSource: 'CrossFileAnalyzer',
    };
}
// Wrap the 4 existing graph AnalyzerRules as CrossFileRule instances
function wrapAnalyzerRule(rule, mitigationHint) {
    return {
        id: rule.id,
        name: rule.name,
        mitigationHint,
        run(graph, _files) {
            const graphViolations = rule.analyze(graph, _files);
            return graphViolations.map(gv => toUnifiedViolation(gv, rule.id, rule.name, mitigationHint));
        },
    };
}
class CrossFileAnalyzer {
    constructor() {
        this.rules = [];
        this.registerDefaultRules();
    }
    registerDefaultRules() {
        // Wrap the real graph-based rules from dependencyGraph.ts
        this.addRule(wrapAnalyzerRule(dependencyGraph_1.controllerBypassRule, 'Inject the Repository through a Service layer instead of accessing it directly from the Controller'));
        this.addRule(wrapAnalyzerRule(dependencyGraph_1.entityExposureRule, 'Replace the Entity type with a dedicated DTO (Data Transfer Object) in the API contract'));
        this.addRule(wrapAnalyzerRule(dependencyGraph_1.cyclicDependencyRule, 'Break the cycle by extracting shared logic into a separate module or introducing an interface'));
        this.addRule(wrapAnalyzerRule(dependencyGraph_1.crossLayerViolationRule, 'Restructure the dependency to follow the layered architecture (Controller → Service → Repository)'));
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    analyze(graph, files) {
        const allViolations = [];
        for (const rule of this.rules) {
            try {
                const violations = rule.run(graph, files);
                allViolations.push(...violations);
            }
            catch (error) {
                console.error(`[CrossFileAnalyzer] Error in rule "${rule.name}":`, error);
            }
        }
        return allViolations;
    }
    getRules() {
        return [...this.rules];
    }
}
exports.CrossFileAnalyzer = CrossFileAnalyzer;
function buildCrossFileAnalyzer() {
    const analyzer = new CrossFileAnalyzer();
    return analyzer;
}
//# sourceMappingURL=crossFileAnalyzer.js.map