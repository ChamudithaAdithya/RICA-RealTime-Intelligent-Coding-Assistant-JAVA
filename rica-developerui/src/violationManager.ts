import * as vscode from 'vscode';
import { ASTManager } from './astManager';
import { ServiceLayerAnalyzer, ServiceLayerViolation } from './serviceLayerDetector';
import { ControllerLayerAnalyzer, ControllerLayerViolation } from './controllerLayerDetector';
import { EntityLayerAnalyzer, EntityLayerViolation } from './entityLayerDetector';
import { APIResourceLayerAnalyzer, APIResourceLayerViolation } from './apiResourceLayerDetector';
import { CrossFileAnalyzer } from './crossFileAnalyzer';
import { buildGraphFromFiles, patchGraphForFile, ProjectDependencyGraph } from './dependencyGraph';
import { Violation, ViolationSummary } from './types/violations';
import { AnalyzerConfig } from './types/analyzerConfig';
import { FullASTOutput } from './astTypes';
import { ImpactAnalyzer, InvalidationMaps } from './impactAnalyzer';

const MITIGATION_HINTS: Record<string, string> = {
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

const DETECTOR_SOURCE_MAP: Record<string, Violation['detectorSource']> = {
    'ServiceLayer': 'ServiceLayer',
    'ControllerLayer': 'ControllerLayer',
    'EntityLayer': 'EntityLayer',
    'APIResourceLayer': 'APIResourceLayer',
};

const RULE_CODE_MAP: Record<string, string> = {
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

const CROSS_FILE_RULE_CODES: Record<string, string> = {
    'controller-bypass': 'RICA-V401',
    'cross-layer-violation': 'RICA-V402',
    'cyclic-dependency': 'RICA-V403',
    'entity-exposure': 'RICA-V404',
};

function layerViolationToUnified(
    v: ServiceLayerViolation | ControllerLayerViolation | EntityLayerViolation | APIResourceLayerViolation,
    source: Violation['detectorSource'],
): Violation {
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

export class ViolationManager {
    private readonly diagnosticCollection: vscode.DiagnosticCollection;
    private readonly astManager: ASTManager;
    private readonly serviceAnalyzer: ServiceLayerAnalyzer;
    private readonly controllerAnalyzer: ControllerLayerAnalyzer;
    private readonly entityAnalyzer: EntityLayerAnalyzer;
    private readonly apiResourceAnalyzer: APIResourceLayerAnalyzer;
    private readonly crossFileAnalyzer: CrossFileAnalyzer;
    private readonly context: vscode.ExtensionContext;

    // Unified violation cache for UI consumers
    private activeViolations: Violation[] = [];

    // Persisted set of ignored violation IDs
    private ignoredViolationIds: Set<string>;

    // Phase 5: Incremental revalidation state
    private graph: ProjectDependencyGraph = new ProjectDependencyGraph();
    private graphMaps: InvalidationMaps = { dependencies: new Map(), dependents: new Map() };
    private filesMap: Record<string, FullASTOutput> = {};
    private localAnalyzers: {
        service: ServiceLayerAnalyzer;
        controller: ControllerLayerAnalyzer;
        entity: EntityLayerAnalyzer;
        api: APIResourceLayerAnalyzer;
    };

    // Phase 8: User configuration
    private config: AnalyzerConfig = {
        enableArchitecturalChecks: true,
        enableDesignPatternChecks: true,
        enableBusinessLogicChecks: true,
        businessLogicThreshold: 3,
        excludePatterns: [],
    };

    constructor(astManager: ASTManager, context: vscode.ExtensionContext) {
        this.astManager = astManager;
        this.loadConfig();
        this.serviceAnalyzer = new ServiceLayerAnalyzer();
        this.serviceAnalyzer = new ServiceLayerAnalyzer();
        this.controllerAnalyzer = new ControllerLayerAnalyzer();
        this.entityAnalyzer = new EntityLayerAnalyzer();
        this.apiResourceAnalyzer = new APIResourceLayerAnalyzer();
        this.crossFileAnalyzer = new CrossFileAnalyzer();
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
        const saved = context.workspaceState.get<string[]>('rica-ignored-violations', []);
        this.ignoredViolationIds = new Set(saved);

        // Listen for config changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('javaAstAnalyzer')) {
                    this.loadConfig();
                    this.update();
                }
            })
        );
    }

    /** Reload user configuration from VS Code settings. */
    private loadConfig(): void {
        const cfg = vscode.workspace.getConfiguration('javaAstAnalyzer');
        this.config = {
            enableArchitecturalChecks: cfg.get<boolean>('enableArchitecturalChecks', true),
            enableDesignPatternChecks: cfg.get<boolean>('enableDesignPatternChecks', true),
            enableBusinessLogicChecks: cfg.get<boolean>('enableBusinessLogicChecks', true),
            businessLogicThreshold: cfg.get<number>('businessLogicThreshold', 3),
            excludePatterns: cfg.get<string[]>('excludePatterns', []),
        };
    }

    public ignoreViolation(id: string): void {
        this.ignoredViolationIds.add(id);
        this.context.workspaceState.update('rica-ignored-violations', Array.from(this.ignoredViolationIds));
        this.refreshDiagnostics();
    }

    public unignoreViolation(id: string): void {
        this.ignoredViolationIds.delete(id);
        this.context.workspaceState.update('rica-ignored-violations', Array.from(this.ignoredViolationIds));
        this.refreshDiagnostics();
    }

    public isIgnored(id: string): boolean {
        return this.ignoredViolationIds.has(id);
    }

    public getIgnoredIds(): string[] {
        return Array.from(this.ignoredViolationIds);
    }

    /** Re-creates VS Code diagnostics from cached violations, filtering out ignored ones. */
    private refreshDiagnostics(): void {
        this.diagnosticCollection.clear();

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;
        const workspaceFolder = workspaceFolders[0];

        const fileMap = new Map<string, Violation[]>();
        for (const v of this.activeViolations) {
            if (!v.filePath) continue;
            if (this.ignoredViolationIds.has(v.id)) continue;
            const arr = fileMap.get(v.filePath) || [];
            arr.push(v);
            fileMap.set(v.filePath, arr);
        }

        for (const [relativePath, vlist] of fileMap) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
            const diagnostics: vscode.Diagnostic[] = [];
            for (const v of vlist) {
                let severity: vscode.DiagnosticSeverity;
                switch (v.severity) {
                    case 'error': severity = vscode.DiagnosticSeverity.Error; break;
                    case 'warning': severity = vscode.DiagnosticSeverity.Warning; break;
                    default: severity = vscode.DiagnosticSeverity.Information; break;
                }
                // Use precise range when available, fall back to line-based
                let range: vscode.Range;
                if (v.range) {
                    range = new vscode.Range(
                        v.range.start.line - 1, v.range.start.character,
                        v.range.end.line - 1, v.range.end.character,
                    );
                } else if (v.lineNumber) {
                    range = new vscode.Range(v.lineNumber - 1, 0, v.lineNumber - 1, 0);
                } else {
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
    public onFileSaved(filePath: string, fileContent: string): void {
        // 1. Parse the changed file
        const oldAst = this.astManager.getCachedAST(filePath) as FullASTOutput | undefined;
        const javaParser = (this.astManager as any).javaParser;
        let newAst: FullASTOutput;
        try {
            newAst = javaParser.parse(fileContent, filePath);
        } catch (e: any) {
            // Fall back to full rebuild on parse failure
            this.update();
            return;
        }

        // 2. Detect public signature change (short-circuit for internal-only changes)
        const sigChanged = ImpactAnalyzer.signatureChanged(oldAst, newAst);

        // 3. Update the AST cache
        (this.astManager as any).fileASTCache.set(filePath, newAst);
        this.filesMap[filePath] = newAst;

        // 4. Run Stage 1 (local) detectors on the changed file only
        const fileAsts = [newAst];
        const newLocalViolations: Violation[] = [
            ...this.serviceAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'ServiceLayer')),
            ...this.controllerAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'ControllerLayer')),
            ...this.entityAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'EntityLayer')),
            ...this.apiResourceAnalyzer.analyze(fileAsts).map(v => layerViolationToUnified(v, 'APIResourceLayer')),
        ];

        // 5. Compute blast radius and update cross-file analysis
        let crossFileViolations: Violation[] = [];
        const affectedFiles = new Set<string>();

        if (sigChanged) {
            // 5a. Patch the dependency graph
            patchGraphForFile(this.graph, filePath, oldAst, newAst, this.filesMap);

            // 5b. Update invalidation maps
            ImpactAnalyzer.updateMapsForFile(filePath, oldAst, newAst, this.filesMap, this.graphMaps);

            // 5c. Compute blast radius
            const radius = ImpactAnalyzer.computeBlastRadius(filePath, this.graphMaps);
            for (const f of radius) affectedFiles.add(f);
            affectedFiles.add(filePath);

            // 5d. Run cross-file analysis scoped to affected files
            const scopedFiles: Record<string, FullASTOutput> = {};
            for (const f of affectedFiles) {
                const ast = this.filesMap[f] || this.astManager.getCachedAST(f) as FullASTOutput | undefined;
                if (ast) scopedFiles[f] = ast;
            }
            crossFileViolations = this.crossFileAnalyzer.analyze(this.graph, scopedFiles);
        } else {
            // Signature unchanged — only the changed file itself can have new local violations
            affectedFiles.add(filePath);
        }

        // 6. Merge violations: replace old entries for affected files, keep everything else
        const affectedSet = new Set(affectedFiles);
        const merged: Violation[] = [
            ...this.activeViolations.filter(v => !affectedSet.has(v.filePath)),
            ...newLocalViolations,
            ...crossFileViolations,
        ];

        this.activeViolations = this.filterByConfig(merged);
        this.refreshDiagnostics();
    }

    public update(): void {
        const allAsts = this.astManager.getAllCachedASTs() as FullASTOutput[];

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
        const unifiedViolations: Violation[] = [
            ...serviceViolations.map(v => layerViolationToUnified(v, 'ServiceLayer')),
            ...controllerViolations.map(v => layerViolationToUnified(v, 'ControllerLayer')),
            ...entityViolations.map(v => layerViolationToUnified(v, 'EntityLayer')),
            ...apiResourceViolations.map(v => layerViolationToUnified(v, 'APIResourceLayer')),
        ];

        // Stage 2: Build dependency graph and run cross-file analysis
        if (allAsts.length > 0) {
            const filesMap: Record<string, FullASTOutput> = {};
            for (const ast of allAsts) {
                if (ast.filePath) {
                    filesMap[ast.filePath] = ast;
                }
            }
            this.graph = buildGraphFromFiles(filesMap);
            this.graphMaps = ImpactAnalyzer.buildFromAstMap(filesMap);
            const crossFileViolations = this.crossFileAnalyzer.analyze(this.graph, filesMap);
            unifiedViolations.push(...crossFileViolations);
        }

        this.activeViolations = this.filterByConfig(unifiedViolations);

        this.refreshDiagnostics();
    }

    /** Returns all currently active violations in unified format for UI consumers. */
    public getActiveViolations(): Violation[] {
        return [...this.activeViolations];
    }

    /** Exposes the live project dependency graph for REST API / visualizer consumption. */
    public getProjectGraph(): ProjectDependencyGraph {
        return this.graph;
    }

    /** Returns a summary count breakdown of active violations. */
    public getActiveViolationsSummary(): ViolationSummary {
        let errors = 0;
        let warnings = 0;
        let info = 0;
        for (const v of this.activeViolations) {
            switch (v.severity) {
                case 'error': errors++; break;
                case 'warning': warnings++; break;
                case 'info': info++; break;
            }
        }
        return { total: this.activeViolations.length, errors, warnings, info };
    }

    /** Returns violations filtered by detector source. */
    public getViolationsBySource(source: Violation['detectorSource']): Violation[] {
        return this.activeViolations.filter(v => v.detectorSource === source);
    }

    /** Returns violations filtered by severity. */
    public getViolationsBySeverity(severity: Violation['severity']): Violation[] {
        return this.activeViolations.filter(v => v.severity === severity);
    }

    /** Filters a violation list against the current user configuration. */
    private filterByConfig(violations: Violation[]): Violation[] {
        const designPatternTypes = new Set([
            'self-instantiation', 'uninjected-repository-access', 'uninjected-service-access',
            'anemic-service', 'package-violation', 'direct-layer-access', 'improper-data-access',
            'direct-service-instantiation',
        ]);
        const businessLogicTypes = new Set([
            'business-logic', 'anemic-entity', 'business-logic-in-resource',
        ]);
        const architecturalSources: ReadonlyArray<Violation['detectorSource']> = ['CrossFileAnalyzer', 'GraphAnalyzer'];

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

    public clear(): void {
        this.diagnosticCollection.clear();
        this.activeViolations = [];
    }
}
