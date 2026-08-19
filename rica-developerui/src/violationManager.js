"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationManager = void 0;
const serviceLayerDetector_1 = require("./serviceLayerDetector");
const controllerLayerDetector_1 = require("./controllerLayerDetector");
const entityLayerDetector_1 = require("./entityLayerDetector");
const apiResourceLayerDetector_1 = require("./apiResourceLayerDetector");
const crossFileAnalyzer_1 = require("./crossFileAnalyzer");
const dependencyGraph_1 = require("./dependencyGraph");
const packageBoundaryDetector_1 = require("./packageBoundaryDetector");
const designPatternAnalyzer_1 = require("./designPatternAnalyzer");
const analyzerConfig_1 = require("./domain/analyzerConfig");
const impactAnalyzer_1 = require("./impactAnalyzer");
const violationCatalog_1 = require("./violationCatalog");
const MITIGATION_HINTS = {
    'self-instantiation': 'Use dependency injection (@Autowired/@Inject) instead of directly instantiating with new()',
    'uninjected-repository-access': 'Annotate the field with @Autowired or use constructor injection',
    'uninjected-service-access': 'Annotate the field with @Autowired or use constructor injection',
    'anemic-service': 'Move business logic from controllers/entities into this service class',
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
    'direct-http-call': 'Delegate HTTP calls to a dedicated gateway service class injected into the controller',
    'file-io': 'Move file I/O operations to a service class injected into the controller',
    'background-thread': 'Use Spring @Async or a TaskExecutor service instead of managing threads directly in the controller',
    'static-cache': 'Replace static cache with a scoped cache service bean (@Cacheable or a dedicated cache manager)',
    'raw-sql-access': 'Move all database access to repository or service layer classes',
};
const RULE_CODE_MAP = {
    'self-instantiation': 'RICA-V101',
    'uninjected-repository-access': 'RICA-V102',
    'uninjected-service-access': 'RICA-V103',
    'anemic-service': 'RICA-V104',
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
    'direct-http-call': 'RICA-V110',
    'file-io': 'RICA-V111',
    'background-thread': 'RICA-V112',
    'static-cache': 'RICA-V113',
    'raw-sql-access': 'RICA-V114',
};
const CROSS_FILE_RULE_CODES = {
    'controller-bypass': 'RICA-V401',
    'cross-layer-violation': 'RICA-V402',
    'cyclic-dependency': 'RICA-V403',
    'entity-exposure': 'RICA-V404',
};
function layerViolationToUnified(v, source) {
    const type = 'type' in v ? v.type : 'unknown';
    const code = RULE_CODE_MAP[type] || `RICA-V000`;
    return {
        id: `${source}-${v.className}-${v.methodName || ''}-${v.fieldName || ''}-${type}-${v.lineNumber || 0}`,
        code,
        ruleName: `${source}: ${type.replace(/-/g, ' ')}`,
        severity: v.severity,
        message: v.message,
        filePath: v.filePath || '',
        lineNumber: v.lineNumber,
        range: v.range,
        explanation: 'explanation' in v ? v.explanation : undefined,
        mitigationHint: violationCatalog_1.VIOLATION_DOC_BY_CODE[code]?.mitigationHint || MITIGATION_HINTS[type] || 'Review the architectural guidelines for this layer',
        documentationUrl: (0, violationCatalog_1.violationDocSlug)(code),
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
    constructor(diagnosticReporter, parserService, configProvider, onIgnoreChanged, initialIgnoredIds) {
        // Unified violation cache for UI consumers
        this.activeViolations = [];
        // Optional AI Reasoning advisory findings (RICA-V000). Never part of the
        // deterministic audit; surfaced separately to the UI and combined on read.
        this.advisoryViolations = [];
        // Persisted set of ignored violation IDs
        this.ignoredViolationIds = new Set();
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
            layerBoundaries: {},
            ai: analyzerConfig_1.DEFAULT_AI_CONFIG,
        };
        this.diagnosticReporter = diagnosticReporter;
        this.parserService = parserService;
        this.configProvider = configProvider;
        this.onIgnoreChanged = onIgnoreChanged;
        this.serviceAnalyzer = new serviceLayerDetector_1.ServiceLayerAnalyzer();
        this.controllerAnalyzer = new controllerLayerDetector_1.ControllerLayerAnalyzer();
        this.entityAnalyzer = new entityLayerDetector_1.EntityLayerAnalyzer();
        this.apiResourceAnalyzer = new apiResourceLayerDetector_1.APIResourceLayerAnalyzer();
        this.crossFileAnalyzer = new crossFileAnalyzer_1.CrossFileAnalyzer();
        this.packageBoundaryAnalyzer = new packageBoundaryDetector_1.PackageBoundaryAnalyzer(this.config);
        this.designPatternAnalyzer = new designPatternAnalyzer_1.DesignPatternAnalyzer(this.config);
        if (initialIgnoredIds) {
            this.ignoredViolationIds = new Set(initialIgnoredIds);
        }
        this.config = configProvider.getConfig();
        this.applyBusinessLogicThreshold();
        this.packageBoundaryAnalyzer.setConfig(this.config);
        configProvider.onConfigChange(() => {
            this.config = configProvider.getConfig();
            this.applyBusinessLogicThreshold();
            this.packageBoundaryAnalyzer.setConfig(this.config);
            this.update();
        });
    }
    applyBusinessLogicThreshold() {
        const threshold = this.config.businessLogicThreshold;
        this.controllerAnalyzer.setBusinessLogicThreshold(threshold);
        this.entityAnalyzer.setBusinessLogicThreshold(threshold);
        this.apiResourceAnalyzer.setBusinessLogicThreshold(threshold);
    }
    ignoreViolation(id) {
        this.ignoredViolationIds.add(id);
        if (this.onIgnoreChanged) {
            this.onIgnoreChanged(Array.from(this.ignoredViolationIds));
        }
        this.refreshDiagnostics();
    }
    unignoreViolation(id) {
        this.ignoredViolationIds.delete(id);
        if (this.onIgnoreChanged) {
            this.onIgnoreChanged(Array.from(this.ignoredViolationIds));
        }
        this.refreshDiagnostics();
    }
    isIgnored(id) {
        return this.ignoredViolationIds.has(id);
    }
    getIgnoredIds() {
        return Array.from(this.ignoredViolationIds);
    }
    /** Re-creates diagnostics from cached violations, filtering out ignored ones. */
    refreshDiagnostics() {
        this.diagnosticReporter.report([...this.activeViolations, ...this.advisoryViolations], this.ignoredViolationIds);
    }
    /**
     * Phase 5: Incremental delta pipeline for single-file changes.
     */
    onFileSaved(filePath, fileContent) {
        // 1. Parse the changed file
        const oldAst = this.filesMap[filePath];
        let newAst;
        try {
            newAst = this.parserService.parse(fileContent, filePath);
        }
        catch (e) {
            this.update();
            return;
        }
        // 2. Detect public signature change (short-circuit for internal-only changes)
        const sigChanged = impactAnalyzer_1.ImpactAnalyzer.signatureChanged(oldAst, newAst);
        // 3. Update the AST cache
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
        let packageBoundaryViolations = [];
        const affectedFiles = new Set();
        if (sigChanged) {
            (0, dependencyGraph_1.patchGraphForFile)(this.graph, filePath, oldAst, newAst, this.filesMap);
            impactAnalyzer_1.ImpactAnalyzer.updateMapsForFile(filePath, oldAst, newAst, this.filesMap, this.graphMaps);
            const radius = impactAnalyzer_1.ImpactAnalyzer.computeBlastRadius(filePath, this.graphMaps);
            for (const f of radius)
                affectedFiles.add(f);
            affectedFiles.add(filePath);
            const scopedFiles = {};
            for (const f of affectedFiles) {
                const ast = this.filesMap[f];
                if (ast)
                    scopedFiles[f] = ast;
            }
            crossFileViolations = this.crossFileAnalyzer.analyze(this.graph, scopedFiles);
        }
        else {
            affectedFiles.add(filePath);
        }
        // Package boundary analysis always runs — it only needs the single-file AST (filePath + imports),
        // not the dependency graph. This ensures V501 violations re-appear after undo.
        packageBoundaryViolations = this.packageBoundaryAnalyzer.toUnifiedViolations(this.packageBoundaryAnalyzer.analyze(fileAsts, undefined, this.buildClassAnnotationsMap()));
        // Design pattern analysis — runs on every change
        let dpViolations = [];
        if (this.config.enableDesignPatternChecks) {
            dpViolations = this.designPatternAnalyzer.analyze(fileAsts, this.graph, this.filesMap);
        }
        // 6. Merge violations
        const affectedSet = new Set(affectedFiles);
        const merged = [
            ...this.activeViolations.filter(v => !affectedSet.has(v.filePath)),
            ...newLocalViolations,
            ...crossFileViolations,
            ...packageBoundaryViolations,
            ...dpViolations,
        ];
        this.activeViolations = this.filterByConfig(merged);
        this.refreshDiagnostics();
    }
    update() {
        const allAsts = Object.values(this.filesMap);
        // Rebuild the files map
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
            // Stage 3: Run package boundary analysis
            const packageViolations = this.packageBoundaryAnalyzer.toUnifiedViolations(this.packageBoundaryAnalyzer.analyze(allAsts, this.graph, this.buildClassAnnotationsMap()));
            unifiedViolations.push(...packageViolations);
            // Stage 4: Run design pattern checks
            if (this.config.enableDesignPatternChecks) {
                const dpViolations = this.designPatternAnalyzer.analyze(allAsts, this.graph, this.filesMap);
                unifiedViolations.push(...dpViolations);
            }
        }
        this.activeViolations = this.filterByConfig(unifiedViolations);
        this.refreshDiagnostics();
    }
    /** Seeds the AST cache with pre-parsed data (called by the framework adapter after parsing). */
    seedCache(asts) {
        for (const ast of asts) {
            if (ast.filePath) {
                this.filesMap[ast.filePath] = ast;
            }
        }
    }
    /** Seeds a single AST entry in the cache. */
    seedFileCache(filePath, ast) {
        this.filesMap[filePath] = ast;
    }
    /** Returns all currently active violations (deterministic + advisory) for the assessment UI. */
    getActiveViolations() {
        return [...this.activeViolations, ...this.advisoryViolations];
    }
    /** Returns only the deterministic audit violations. */
    getDeterministicViolations() {
        return [...this.activeViolations];
    }
    /** Returns net-new advisory findings produced by the AI Reasoning pass. */
    getAdvisoryViolations() {
        return [...this.advisoryViolations];
    }
    /** Latest AST cache for the AI context builder. */
    getFilesMap() {
        return this.filesMap;
    }
    /** Replaces the advisory findings set (called by the AI Reasoning coordinator). */
    setAdvisoryViolations(list) {
        this.advisoryViolations = list;
        this.refreshDiagnostics();
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
            'direct-service-instantiation', 'direct-http-call', 'file-io', 'background-thread',
            'static-cache', 'raw-sql-access',
        ]);
        const businessLogicTypes = new Set([
            'business-logic', 'anemic-entity', 'business-logic-in-resource',
        ]);
        const architecturalSources = ['CrossFileAnalyzer', 'GraphAnalyzer', 'PackageBoundaryAnalyzer'];
        return violations.filter(v => {
            if (architecturalSources.includes(v.detectorSource) && !this.config.enableArchitecturalChecks) {
                return false;
            }
            if (v.legacyType && designPatternTypes.has(v.legacyType) && !this.config.enableDesignPatternChecks) {
                return false;
            }
            if (v.legacyType && businessLogicTypes.has(v.legacyType) && !this.config.enableBusinessLogicChecks) {
                return false;
            }
            return true;
        });
    }
    clear() {
        this.diagnosticReporter.clear();
        this.activeViolations = [];
        this.advisoryViolations = [];
    }
    buildClassAnnotationsMap() {
        const map = new Map();
        for (const ast of Object.values(this.filesMap)) {
            for (const cls of ast.classes) {
                const fqcn = cls.fullyQualifiedName || cls.className;
                map.set(fqcn, (cls.annotations || []).map(a => a.name));
            }
        }
        return map;
    }
}
exports.ViolationManager = ViolationManager;
//# sourceMappingURL=violationManager.js.map