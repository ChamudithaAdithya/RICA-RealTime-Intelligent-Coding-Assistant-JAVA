import { Violation, DiagnosticRange } from './types/violations';
import {
    ProjectDependencyGraph, buildGraphFromFiles,
    AnalyzerRule, Violation as GraphViolation,
    controllerBypassRule, entityExposureRule,
    cyclicDependencyRule, crossLayerViolationRule
} from './dependencyGraph';
import { FullASTOutput } from './astTypes';
import { violationDocSlug } from './violationCatalog';

export interface CrossFileRule {
    id: string;
    name: string;
    mitigationHint: string;
    run(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[];
}

const CROSS_FILE_CODE_MAP: Record<string, string> = {
    'LAYER_BYPASS': 'RICA-V401',
    'CROSS_LAYER': 'RICA-V402',
    'CYCLIC_DEP': 'RICA-V403',
    'ENTITY_EXPOSURE': 'RICA-V404',
};

function toUnifiedViolation(
    gv: GraphViolation,
    ruleId: string,
    ruleName: string,
    mitigationHint: string,
): Violation {
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
        documentationUrl: violationDocSlug(CROSS_FILE_CODE_MAP[ruleId]),
        detectorSource: 'CrossFileAnalyzer',
    };
}

function toUnifiedFromEdge(
    graph: ProjectDependencyGraph,
    sourceId: string,
    targetId: string,
    edgeType: string,
    ruleId: string,
    ruleName: string,
    severity: Violation['severity'],
    message: string,
    mitigationHint: string,
    filePath?: string,
    line?: number,
    layerContext?: string,
    explanation?: string,
): Violation {
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
        documentationUrl: violationDocSlug(CROSS_FILE_CODE_MAP[ruleId]),
        detectorSource: 'CrossFileAnalyzer',
    };
}

// Wrap the 4 existing graph AnalyzerRules as CrossFileRule instances
function wrapAnalyzerRule(rule: AnalyzerRule, mitigationHint: string): CrossFileRule {
    return {
        id: rule.id,
        name: rule.name,
        mitigationHint,
        run(graph: ProjectDependencyGraph, _files: Record<string, FullASTOutput>): Violation[] {
            const graphViolations = rule.analyze(graph, _files);
            return graphViolations.map(gv => toUnifiedViolation(gv, rule.id, rule.name, mitigationHint));
        },
    };
}

export class CrossFileAnalyzer {
    private rules: CrossFileRule[] = [];

    constructor() {
        this.registerDefaultRules();
    }

    private registerDefaultRules(): void {
        // Wrap the real graph-based rules from dependencyGraph.ts
        this.addRule(wrapAnalyzerRule(controllerBypassRule,
            'Inject the Repository through a Service layer instead of accessing it directly from the Controller'));
        this.addRule(wrapAnalyzerRule(entityExposureRule,
            'Replace the Entity type with a dedicated DTO (Data Transfer Object) in the API contract'));
        this.addRule(wrapAnalyzerRule(cyclicDependencyRule,
            'Break the cycle by extracting shared logic into a separate module or introducing an interface'));
        this.addRule(wrapAnalyzerRule(crossLayerViolationRule,
            'Restructure the dependency to follow the layered architecture (Controller → Service → Repository)'));
    }

    public addRule(rule: CrossFileRule): void {
        this.rules.push(rule);
    }

    public analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[] {
        const allViolations: Violation[] = [];
        for (const rule of this.rules) {
            try {
                const violations = rule.run(graph, files);
                allViolations.push(...violations);
            } catch (error) {
                console.error(`[CrossFileAnalyzer] Error in rule "${rule.name}":`, error);
            }
        }
        return allViolations;
    }

    public getRules(): CrossFileRule[] {
        return [...this.rules];
    }
}

export function buildCrossFileAnalyzer(): CrossFileAnalyzer {
    const analyzer = new CrossFileAnalyzer();
    return analyzer;
}
