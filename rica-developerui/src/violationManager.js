"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationManager = void 0;
const vscode = __importStar(require("vscode"));
const serviceLayerDetector_1 = require("./serviceLayerDetector");
const controllerLayerDetector_1 = require("./controllerLayerDetector");
const entityLayerDetector_1 = require("./entityLayerDetector");
const apiResourceLayerDetector_1 = require("./apiResourceLayerDetector");
const crossFileAnalyzer_1 = require("./crossFileAnalyzer");
const dependencyGraph_1 = require("./dependencyGraph");
const impactAnalyzer_1 = require("./impactAnalyzer");
const MITIGATION_HINTS = {
    'self-instantiation': 'Use dependency injection (@Autowired/@Inject) instead of directly instantiating with new()',
    'uninjected-repository-access': 'Annotate the field with @Autowired or use constructor injection',
    'uninjected-service-access': 'Annotate the field with @Autowired or use constructor injection',
    'anemic-service': 'Move business logic from controllers/entities into this service class',
    'package-violation': 'Move the class to the correct package following the layered architecture',
    'business-logic': 'Business logic should be in the Service layer, not in Controllers or Entities',
    'direct-layer-access': 'Access external layers through the Service layer instead of directly',
    'anemic-entity': 'Add behavior (methods) to the entity instead of keeping it as a pure data holder',
    'improper-data-access': 'Entities should not contain data access logic — move to Repository',
    'exposing-internal-entity': 'Replace the Entity return type with a DTO to avoid leaking persistence details',
    'missing-dto-usage': 'Create and use a DTO class instead of exposing internal types in the API',
    'improper-error-handling': 'Add proper error handling (try-catch or exception declarations) to API methods',
    'business-logic-in-resource': 'Move business logic from the API resource to the Service layer',
    'direct-service-instantiation': 'Inject the Service via constructor instead of instantiating it',
    'missing-validation': 'Add validation annotations (@Valid, @NotNull, etc.) to API method parameters',
    'exposing-internal-structure': 'Refactor the API to return DTOs instead of internal domain objects',
};
const DETECTOR_SOURCE_MAP = {
    'ServiceLayer': 'ServiceLayer',
    'ControllerLayer': 'ControllerLayer',
    'EntityLayer': 'EntityLayer',
    'APIResourceLayer': 'APIResourceLayer',
};
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
const CROSS_FILE_RULE_CODES = {
    'controller-bypass': 'RICA-V401',
    'cross-layer-violation': 'RICA-V402',
    'cyclic-dependency': 'RICA-V403',
    'entity-exposure': 'RICA-V404',
};
function layerViolationToUnified(v, source) {
    const type = 'type' in v ? v.type : 'unknown';
    return {
        id: `${source}-${v.className}-${v.methodName || ''}-${v.fieldName || ''}-${type}-${v.lineNumber || 0}`,
        code: RULE_CODE_MAP[type] || `RICA-V000`,
        ruleName: `${source}: ${type.replace(/-/g, ' ')}`,
        severity: v.severity,
        message: v.message,
        filePath: v.filePath || '',
        lineNumber: v.lineNumber,
        range: v.range,
        explanation: 'explanation' in v ? v.explanation : undefined,
        mitigationHint: MITIGATION_HINTS[type] || 'Review the architectural guidelines for this layer',
        legacyType: type,
        detectorSource: source,
        contextMetadata: {
            methodName: v.methodName,
            fieldName: v.fieldName,
            receiverVariable: 'receiverVariable' in v ? v.receiverVariable : undefined,
        },
    };
}
class ViolationManager {
    constructor(astManager, context) {
        // Unified violation cache for UI consumers
        this.activeViolations = [];
        // Phase 5: Incremental revalidation state
        this.graph = new dependencyGraph_1.ProjectDependencyGraph();
        this.graphMaps = { dependencies: new Map(), dependents: new Map() };
        this.filesMap = {};
        // Phase 8: User configuration
        this.config = {
            enableArchitecturalChecks: true,
            enableDesignPatternChecks: true,
            enableBusinessLogicChecks: true,
            businessLogicThreshold: 3,
            excludePatterns: [],
        };
        this.astManager = astManager;
        this.loadConfig();
        this.serviceAnalyzer = new serviceLayerDetector_1.ServiceLayerAnalyzer();
        this.serviceAnalyzer = new serviceLayerDetector_1.ServiceLayerAnalyzer();
        this.controllerAnalyzer = new controllerLayerDetector_1.ControllerLayerAnalyzer();
        this.entityAnalyzer = new entityLayerDetector_1.EntityLayerAnalyzer();
        this.apiResourceAnalyzer = new apiResourceLayerDetector_1.APIResourceLayerAnalyzer();
        this.crossFileAnalyzer = new crossFileAnalyzer_1.CrossFileAnalyzer();
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('java-layer-analyzer');
        this.context = context;
        this.localAnalyzers = {
            service: this.serviceAnalyzer,
            controller: this.controllerAnalyzer,
            entity: this.entityAnalyzer,
            api: this.apiResourceAnalyzer,
        };
        context.subscriptions.push(this.diagnosticCollection);
        // Load persisted ignored violations
        const saved = context.workspaceState.get('rica-ignored-violations', []);
        this.ignoredViolationIds = new Set(saved);
        // Listen for config changes
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('javaAstAnalyzer')) {
                this.loadConfig();
                this.update();
            }
        }));
    }
    /** Reload user configuration from VS Code settings. */
    loadConfig() {
        const cfg = vscode.workspace.getConfiguration('javaAstAnalyzer');
        this.config = {
            enableArchitecturalChecks: cfg.get('enableArchitecturalChecks', true),
            enableDesignPatternChecks: cfg.get('enableDesignPatternChecks', true),
            enableBusinessLogicChecks: cfg.get('enableBusinessLogicChecks', true),
            businessLogicThreshold: cfg.get('businessLogicThreshold', 3),
            excludePatterns: cfg.get('excludePatterns', []),
        };
    }
    ignoreViolation(id) {
        this.ignoredViolationIds.add(id);
        this.context.workspaceState.update('rica-ignored-violations', Array.from(this.ignoredViolationIds));
        this.refreshDiagnostics();
    }
    unignoreViolation(id) {
        this.ignoredViolationIds.delete(id);
        this.context.workspaceState.update('rica-ignored-violations', Array.from(this.ignoredViolationIds));
        this.refreshDiagnostics();
    }
    isIgnored(id) {
        return this.ignoredViolationIds.has(id);
    }
    getIgnoredIds() {
        return Array.from(this.ignoredViolationIds);
    }
    /** Re-creates VS Code diagnostics from cached violations, filtering out ignored ones. */
    refreshDiagnostics() {
        this.diagnosticCollection.clear();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0)
            return;
        const workspaceFolder = workspaceFolders[0];
        const fileMap = new Map();
        for (const v of this.activeViolations) {
            if (!v.filePath)
                continue;
            if (this.ignoredViolationIds.has(v.id))
                continue;
            const arr = fileMap.get(v.filePath) || [];
            arr.push(v);
            fileMap.set(v.filePath, arr);
        }
        for (const [relativePath, vlist] of fileMap) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
            const diagnostics = [];
            for (const v of vlist) {
                let severity;
                switch (v.severity) {
                    case 'error':
                        severity = vscode.DiagnosticSeverity.Error;
                        break;
                    case 'warning':
                        severity = vscode.DiagnosticSeverity.Warning;
                        break;
                    default:
                        severity = vscode.DiagnosticSeverity.Information;
                        break;
                }
                // Use precise range when available, fall back to line-based
                let range;
                if (v.range) {
                    range = new vscode.Range(v.range.start.line - 1, v.range.start.character, v.range.end.line - 1, v.range.end.character);
                }
                else if (v.lineNumber) {
                    range = new vscode.Range(v.lineNumber - 1, 0, v.lineNumber - 1, 0);
                }
                else {
                    range = new vscode.Range(0, 0, 0, 0);
                }
                const severityLabel = v.severity === 'error' ? '[Error]' : v.severity === 'warning' ? '[Warning]' : '[Info]';
                const codePrefix = v.code ? `[${v.code}] ` : '';
                const diag = new vscode.Diagnostic(range, `${codePrefix}${severityLabel} ${v.message}`, severity);
                diag.source = 'Java Layer Analyzer';
                diag.code = v.id;
                diagnostics.push(diag);
            }
            this.diagnosticCollection.set(fileUri, diagnostics);
        }
    }
    /**
     * Phase 5: Incremental delta pipeline for single-file changes.
     * Instead of rebuilding everything, this method:
     *   1. Re-parses only the changed file into the AST cache
     *   2. Re-runs local (Stage 1) detectors only on that file
     *   3. Patches the dependency graph incrementally
     *   4. Computes blast radius via BFS
     *   5. Re-runs cross-file analysis only on affected files
     *   6. Merges delta violations, replacing stale entries for affected files
     */
    onFileSaved(filePath, fileContent) {
        // 1. Parse the changed file
        const oldAst = this.astManager.getCachedAST(filePath);
        const javaParser = this.astManager.javaParser;
        let newAst;
        try {
            newAst = javaParser.parse(fileContent, filePath);
        }
        catch (e) {
            // Fall back to full rebuild on parse failure
            this.update();
            return;
        }
        // 2. Detect public signature change (short-circuit for internal-only changes)
        const sigChanged = impactAnalyzer_1.ImpactAnalyzer.signatureChanged(oldAst, newAst);
        // 3. Update the AST cache
        this.astManager.fileASTCache.set(filePath, newAst);
        this.filesMap[filePath] = newAst;
        // 4. Run Stage 1 (local) detectors on the changed file only
        const fileAsts = [newAst];
        const newLocalViolations = [
            ...this.serviceAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'ServiceLayer')),
            ...this.controllerAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'ControllerLayer')),
            ...this.entityAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'EntityLayer')),
            ...this.apiResourceAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'APIResourceLayer')),
        ];
        // 5. Compute blast radius and update cross-file analysis
        let crossFileViolations = [];
        const affectedFiles = new Set();
        if (sigChanged) {
            // 5a. Patch the dependency graph
            (0, dependencyGraph_1.patchGraphForFile)(this.graph, filePath, oldAst, newAst, this.filesMap);
            // 5b. Update invalidation maps
            impactAnalyzer_1.ImpactAnalyzer.updateMapsForFile(filePath, oldAst, newAst, this.filesMap, this.graphMaps);
            // 5c. Compute blast radius
            const radius = impactAnalyzer_1.ImpactAnalyzer.computeBlastRadius(filePath, this.graphMaps);
            for (const f of radius)
                affectedFiles.add(f);
            affectedFiles.add(filePath);
            // 5d. Run cross-file analysis scoped to affected files
            const scopedFiles = {};
            for (const f of affectedFiles) {
                const ast = this.filesMap[f] || this.astManager.getCachedAST(f);
                if (ast)
                    scopedFiles[f] = ast;
            }
            crossFileViolations = this.crossFileAnalyzer.analyze(this.graph, scopedFiles);
        }
        else {
            // Signature unchanged — only the changed file itself can have new local violations
            affectedFiles.add(filePath);
        }
        // 6. Merge violations: replace old entries for affected files, keep everything else
        const affectedSet = new Set(affectedFiles);
        const merged = [
            ...this.activeViolations.filter(v => !affectedSet.has(v.filePath)),
            ...newLocalViolations,
            ...crossFileViolations,
        ];
        this.activeViolations = this.filterByConfig(merged);
        this.refreshDiagnostics();
    }
    update() {
        const allAsts = this.astManager.getAllCachedASTs();
        // Rebuild the files map for graph construction
        this.filesMap = {};
        for (const ast of allAsts) {
            if (ast.filePath) {
                this.filesMap[ast.filePath] = ast;
            }
        }
        // Stage 1: Run local layer-specific detectors
        const serviceViolations = this.serviceAnalyzer.analyze(allAsts);
        const controllerViolations = this.controllerAnalyzer.analyze(allAsts);
        const entityViolations = this.entityAnalyzer.analyze(allAsts);
        const apiResourceViolations = this.apiResourceAnalyzer.analyze(allAsts);
        // Convert all local violations to unified format
        const unifiedViolations = [
            ...serviceViolations.map(v => layerViolationToUnified(v, 'ServiceLayer')),
            ...controllerViolations.map(v => layerViolationToUnified(v, 'ControllerLayer')),
            ...entityViolations.map(v => layerViolationToUnified(v, 'EntityLayer')),
            ...apiResourceViolations.map(v => layerViolationToUnified(v, 'APIResourceLayer')),
        ];
        // Stage 2: Build dependency graph and run cross-file analysis
        if (allAsts.length > 0) {
            const filesMap = {};
            for (const ast of allAsts) {
                if (ast.filePath) {
                    filesMap[ast.filePath] = ast;
                }
            }
            this.graph = (0, dependencyGraph_1.buildGraphFromFiles)(filesMap);
            this.graphMaps = impactAnalyzer_1.ImpactAnalyzer.buildFromAstMap(filesMap);
            const crossFileViolations = this.crossFileAnalyzer.analyze(this.graph, filesMap);
            unifiedViolations.push(...crossFileViolations);
        }
        this.activeViolations = this.filterByConfig(unifiedViolations);
        this.refreshDiagnostics();
    }
    /** Returns all currently active violations in unified format for UI consumers. */
    getActiveViolations() {
        return [...this.activeViolations];
    }
    /** Exposes the live project dependency graph for REST API / visualizer consumption. */
    getProjectGraph() {
        return this.graph;
    }
    /** Returns a summary count breakdown of active violations. */
    getActiveViolationsSummary() {
        let errors = 0;
        let warnings = 0;
        let info = 0;
        for (const v of this.activeViolations) {
            switch (v.severity) {
                case 'error':
                    errors++;
                    break;
                case 'warning':
                    warnings++;
                    break;
                case 'info':
                    info++;
                    break;
            }
        }
        return { total: this.activeViolations.length, errors, warnings, info };
    }
    /** Returns violations filtered by detector source. */
    getViolationsBySource(source) {
        return this.activeViolations.filter(v => v.detectorSource === source);
    }
    /** Returns violations filtered by severity. */
    getViolationsBySeverity(severity) {
        return this.activeViolations.filter(v => v.severity === severity);
    }
    /** Filters a violation list against the current user configuration. */
    filterByConfig(violations) {
        const designPatternTypes = new Set([
            'self-instantiation', 'uninjected-repository-access', 'uninjected-service-access',
            'anemic-service', 'package-violation', 'direct-layer-access', 'improper-data-access',
            'direct-service-instantiation',
        ]);
        const businessLogicTypes = new Set([
            'business-logic', 'anemic-entity', 'business-logic-in-resource',
        ]);
        const architecturalSources = ['CrossFileAnalyzer', 'GraphAnalyzer'];
        return violations.filter(v => {
            // Architectural checks gate
            if (architecturalSources.includes(v.detectorSource) && !this.config.enableArchitecturalChecks) {
                return false;
            }
            // Design pattern checks gate
            if (v.legacyType && designPatternTypes.has(v.legacyType) && !this.config.enableDesignPatternChecks) {
                return false;
            }
            // Business logic checks gate
            if (v.legacyType && businessLogicTypes.has(v.legacyType) && !this.config.enableBusinessLogicChecks) {
                return false;
            }
            return true;
        });
    }
    clear() {
        this.diagnosticCollection.clear();
        this.activeViolations = [];
    }
}
exports.ViolationManager = ViolationManager;
//# sourceMappingURL=violationManager.js.map