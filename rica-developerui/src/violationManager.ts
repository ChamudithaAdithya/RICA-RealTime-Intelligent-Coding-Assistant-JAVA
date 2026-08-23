import { ServiceLayerAnalyzer, ServiceLayerViolation } from './serviceLayerDetector';
import { ControllerLayerAnalyzer, ControllerLayerViolation } from './controllerLayerDetector';
import { EntityLayerAnalyzer, EntityLayerViolation } from './entityLayerDetector';
import { APIResourceLayerAnalyzer, APIResourceLayerViolation } from './apiResourceLayerDetector';
import { CrossFileAnalyzer } from './crossFileAnalyzer';
import { buildGraphFromFiles, patchGraphForFile, ProjectDependencyGraph } from './dependencyGraph';
import { PackageBoundaryAnalyzer } from './packageBoundaryDetector';
import { DesignPatternAnalyzer } from './designPatternAnalyzer';
import { Violation, ViolationSummary } from './domain/violations';
import { AnalyzerConfig, DEFAULT_AI_CONFIG } from './domain/analyzerConfig';
import { FullASTOutput } from './domain/astTypes';
import { ImpactAnalyzer, InvalidationMaps } from './impactAnalyzer';
import { DiagnosticReporter } from './application/ports/diagnosticReporter';
import { ParserService } from './application/ports/parserService';
import { ConfigProvider } from './application/ports/configProvider';
import { VIOLATION_DOC_BY_CODE, violationDocSlug } from './violationCatalog';
import { FixSuggestionEngine } from './fixSuggestionEngine';

const MITIGATION_HINTS: Record<string, string> = {
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

const RULE_CODE_MAP: Record<string, string> = {
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
        mitigationHint: VIOLATION_DOC_BY_CODE[code]?.mitigationHint || MITIGATION_HINTS[type] || 'Review the architectural guidelines for this layer',
        documentationUrl: violationDocSlug(code),
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
    private readonly diagnosticReporter: DiagnosticReporter;
    private readonly parserService: ParserService;
    private readonly configProvider: ConfigProvider;
    private readonly serviceAnalyzer: ServiceLayerAnalyzer;
    private readonly controllerAnalyzer: ControllerLayerAnalyzer;
    private readonly entityAnalyzer: EntityLayerAnalyzer;
    private readonly apiResourceAnalyzer: APIResourceLayerAnalyzer;
    private readonly crossFileAnalyzer: CrossFileAnalyzer;
    private readonly packageBoundaryAnalyzer: PackageBoundaryAnalyzer;
    private readonly designPatternAnalyzer: DesignPatternAnalyzer;
    private readonly fixSuggestionEngine: FixSuggestionEngine;

    // Callback for persisting ignored violations (wired by the framework adapter)
    private readonly onIgnoreChanged?: (ignoredIds: string[]) => void;

    // Unified violation cache for UI consumers
    private activeViolations: Violation[] = [];
    private onViolationsChanged?: () => void;

    // Optional AI Reasoning advisory findings (RICA-V000). Never part of the
    // deterministic audit; surfaced separately to the UI and combined on read.
    private advisoryViolations: Violation[] = [];

    // Persisted set of ignored violation IDs
    private ignoredViolationIds: Set<string> = new Set();

    // Phase 5: Incremental revalidation state
    private graph: ProjectDependencyGraph = new ProjectDependencyGraph();
    private graphMaps: InvalidationMaps = { dependencies: new Map(), dependents: new Map() };
    private filesMap: Record<string, FullASTOutput> = {};

    // Phase 8: User configuration
    private config: AnalyzerConfig = {
        enableArchitecturalChecks: true,
        enableDesignPatternChecks: true,
        enableBusinessLogicChecks: true,
        businessLogicThreshold: 3,
        excludePatterns: [],
        layerBoundaries: {},
        ai: DEFAULT_AI_CONFIG,
    };

    constructor(
        diagnosticReporter: DiagnosticReporter,
        parserService: ParserService,
        configProvider: ConfigProvider,
        onIgnoreChanged?: (ignoredIds: string[]) => void,
        initialIgnoredIds?: string[],
    ) {
        this.diagnosticReporter = diagnosticReporter;
        this.parserService = parserService;
        this.configProvider = configProvider;
        this.onIgnoreChanged = onIgnoreChanged;

        this.serviceAnalyzer = new ServiceLayerAnalyzer();
        this.controllerAnalyzer = new ControllerLayerAnalyzer();
        this.entityAnalyzer = new EntityLayerAnalyzer();
        this.apiResourceAnalyzer = new APIResourceLayerAnalyzer();
        this.crossFileAnalyzer = new CrossFileAnalyzer();
        this.packageBoundaryAnalyzer = new PackageBoundaryAnalyzer(this.config);
        this.designPatternAnalyzer = new DesignPatternAnalyzer(this.config);
        this.fixSuggestionEngine = new FixSuggestionEngine();

        if (initialIgnoredIds) {
            this.ignoredViolationIds = new Set(initialIgnoredIds);
        }

        this.config = configProvider.getConfig();
        this.applyBusinessLogicThreshold();
        this.packageBoundaryAnalyzer.setConfig(this.config);
        this.designPatternAnalyzer.setConfig(this.config);
        configProvider.onConfigChange(() => {
            this.config = configProvider.getConfig();
            this.applyBusinessLogicThreshold();
            this.packageBoundaryAnalyzer.setConfig(this.config);
            this.designPatternAnalyzer.setConfig(this.config);
            this.update();
        });
    }

    private applyBusinessLogicThreshold(): void {
        const threshold = this.config.businessLogicThreshold;
        this.controllerAnalyzer.setBusinessLogicThreshold(threshold);
        this.entityAnalyzer.setBusinessLogicThreshold(threshold);
        this.apiResourceAnalyzer.setBusinessLogicThreshold(threshold);
    }

    public ignoreViolation(id: string): void {
        this.ignoredViolationIds.add(id);
        if (this.onIgnoreChanged) {
            this.onIgnoreChanged(Array.from(this.ignoredViolationIds));
        }
        this.refreshDiagnostics();
    }

    public unignoreViolation(id: string): void {
        this.ignoredViolationIds.delete(id);
        if (this.onIgnoreChanged) {
            this.onIgnoreChanged(Array.from(this.ignoredViolationIds));
        }
        this.refreshDiagnostics();
    }

    public isIgnored(id: string): boolean {
        return this.ignoredViolationIds.has(id);
    }

    public getIgnoredIds(): string[] {
        return Array.from(this.ignoredViolationIds);
    }

    /** Re-creates diagnostics from cached violations, filtering out ignored ones. */
    private refreshDiagnostics(): void {
        this.diagnosticReporter.report([...this.activeViolations, ...this.advisoryViolations], this.ignoredViolationIds);
        this.onViolationsChanged?.();
    }

    public setOnViolationsChanged(callback?: () => void): void {
        this.onViolationsChanged = callback;
    }

    /**
     * Phase 5: Incremental delta pipeline for single-file changes.
     */
    public onFileSaved(filePath: string, fileContent: string): void {
        // 1. Parse the changed file
        const oldAst = this.filesMap[filePath];
        let newAst: FullASTOutput;
        try {
            newAst = this.parserService.parse(fileContent, filePath);
        } catch (e: any) {
            // Parse failure (e.g. mid-edit syntax error): drop the file's AST from
            // the cache so its previous violations do NOT linger as stale findings.
            // The file re-enters analysis automatically once it parses again.
            delete this.filesMap[filePath];
            this.update();
            return;
        }

        // 2. Detect public signature change (short-circuit for internal-only changes)
        const sigChanged = ImpactAnalyzer.signatureChanged(oldAst, newAst);

        // 3. Update the AST cache
        this.filesMap[filePath] = newAst;

        // A method-body edit can change calls, relationships, or design-pattern
        // evidence without changing the public signature. Rebuild all derived
        // state so cross-file findings never remain stale.
        this.update();
        return;

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
        let packageBoundaryViolations: Violation[] = [];
        const affectedFiles = new Set<string>();

        if (sigChanged) {
            // Public signature changes can affect any dependent file. Rebuild all
            // derived analysis state so local and cross-file findings stay aligned.
            this.update();
            return;
        } else {
            affectedFiles.add(filePath);
        }
        // Package boundary analysis always runs — it only needs the single-file AST (filePath + imports),
        // not the dependency graph. This ensures V501 violations re-appear after undo.
        packageBoundaryViolations = this.packageBoundaryAnalyzer.toUnifiedViolations(
            this.packageBoundaryAnalyzer.analyze(fileAsts, undefined, this.buildClassAnnotationsMap())
        );

        // Design pattern analysis — runs on every change
        let dpViolations: Violation[] = [];
        if (this.config.enableDesignPatternChecks) {
            dpViolations = this.designPatternAnalyzer.analyze(fileAsts, this.graph, this.filesMap);
        }

        // 6. Merge violations
        const affectedSet = new Set(affectedFiles);
        const merged: Violation[] = [
            ...this.activeViolations.filter(v => !affectedSet.has(v.filePath)),
            ...newLocalViolations,
            ...crossFileViolations,
            ...packageBoundaryViolations,
            ...dpViolations,
        ];

        this.activeViolations = this.withFixSuggestions(this.filterByConfig(this.deduplicate(merged)));
        this.refreshDiagnostics();
    }

    /**
     * Global deduplication: the same underlying issue can be emitted by more than
     * one detector (e.g. a local layer detector AND a graph rule both flag
     * controller → repository access). Keep the first occurrence per stable key.
     */
    private deduplicate(violations: Violation[]): Violation[] {
        const seen = new Set<string>();
        return violations.filter(v => {
            const key = `${v.code || v.ruleName}|${v.filePath}|${v.lineNumber || 0}|${v.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    public update(): void {
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

            // Stage 3: Run package boundary analysis
            const packageViolations = this.packageBoundaryAnalyzer.toUnifiedViolations(
                this.packageBoundaryAnalyzer.analyze(allAsts, this.graph, this.buildClassAnnotationsMap())
            );
            unifiedViolations.push(...packageViolations);

            // Stage 4: Run design pattern checks
            if (this.config.enableDesignPatternChecks) {
                const dpViolations = this.designPatternAnalyzer.analyze(allAsts, this.graph, this.filesMap);
                unifiedViolations.push(...dpViolations);
            }
        }

        this.activeViolations = this.withFixSuggestions(this.filterByConfig(this.deduplicate(unifiedViolations)));
        this.refreshDiagnostics();
    }

    private withFixSuggestions(violations: Violation[]): Violation[] {
        return this.fixSuggestionEngine.enrich(violations);
    }

    /**
     * File lifecycle: a .java file was deleted (or renamed away). Drop its AST
     * and every violation attributed to it so deleted files cannot keep
     * reporting findings. Renames combine this with onFileSaved for the new path.
     */
    public onFileDeleted(filePath: string): void {
        delete this.filesMap[filePath];
        this.update();
    }

    /** Seeds the AST cache with pre-parsed data (called by the framework adapter after parsing). */
    public seedCache(asts: FullASTOutput[]): void {
        for (const ast of asts) {
            if (ast.filePath) {
                this.filesMap[ast.filePath] = ast;
            }
        }
    }

    /** Seeds a single AST entry in the cache. */
    public seedFileCache(filePath: string, ast: FullASTOutput): void {
        this.filesMap[filePath] = ast;
    }

    /** Returns all currently active violations (deterministic + advisory) for the assessment UI. */
    public getActiveViolations(): Violation[] {
        return [...this.activeViolations, ...this.advisoryViolations];
    }

    /** Returns only the deterministic audit violations. */
    public getDeterministicViolations(): Violation[] {
        return [...this.activeViolations];
    }

    /** Returns net-new advisory findings produced by the AI Reasoning pass. */
    public getAdvisoryViolations(): Violation[] {
        return [...this.advisoryViolations];
    }

    /** Latest AST cache for the AI context builder. */
    public getFilesMap(): Record<string, FullASTOutput> {
        return this.filesMap;
    }

    /** Replaces the advisory findings set (called by the AI Reasoning coordinator). */
    public setAdvisoryViolations(list: Violation[]): void {
        this.advisoryViolations = list;
        this.refreshDiagnostics();
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
            'direct-service-instantiation', 'direct-http-call', 'file-io', 'background-thread',
            'static-cache', 'raw-sql-access',
        ]);
        const businessLogicTypes = new Set([
            'business-logic', 'anemic-entity', 'business-logic-in-resource',
        ]);
        const architecturalSources: ReadonlyArray<Violation['detectorSource']> = ['CrossFileAnalyzer', 'GraphAnalyzer', 'PackageBoundaryAnalyzer'];

        return violations.filter(v => {
            if (this.isSuppressed(v)) return false;
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

    private isSuppressed(v: Violation): boolean {
        if (!v.code) return false;
        const suppressedCode: string = v.code;
        const ast = this.filesMap[v.filePath];
        if (!ast) return false;
        // Inline comment suppression: // rica-disable-next-line. The comment sits on
        // the line immediately ABOVE the suppressed statement, so only a ±1 window
        // is honored — wider windows silently hid unrelated violations.
        const line = v.lineNumber || v.range?.start.line || 0;
        for (let d = -1; d <= 1; d++) {
            const suppressedForLine = ast.suppressedLines?.[line + d];
            if (suppressedForLine && (suppressedForLine.includes('all') || suppressedForLine.includes(suppressedCode))) return true;
        }
        // Annotation suppression: @SuppressWarnings("rica:V111") or "rica:all"
        const code: string = suppressedCode;
        const matchAnnotation = (anns: any[] | undefined): boolean => {
            if (!anns) return false;
            for (const a of anns) {
                if (a.name !== 'SuppressWarnings') continue;
                // If elements empty, parser didn't capture value — treat bare @SuppressWarnings as suppressing all rica codes (conservative)
                const hasElements = a.elements && Object.keys(a.elements).length > 0;
                if (!hasElements) return true;
                const raw = JSON.stringify(a.elements || a).toLowerCase();
                if (raw.includes('rica:all') || raw.includes('"all"')) return true;
                // check for code substring e.g. v111
                const num = code.match(/V\d{3}/)?.[0]?.toLowerCase();
                if (num && raw.includes(num.toLowerCase())) return true;
                if (raw.includes(code.toLowerCase())) return true;
            }
            return false;
        };
        for (const cls of ast.classes) {
            const inClass = !v.lineNumber || (v.lineNumber >= (cls.startLine || 0) && v.lineNumber <= (cls.endLine || 999999));
            if (!inClass) continue;
            if (matchAnnotation(cls.annotations)) return true;
            for (const m of cls.methods) {
                const inMethod = v.contextMetadata?.methodName ? m.name === v.contextMetadata.methodName : (v.lineNumber && v.lineNumber >= (m.startLine||0) && v.lineNumber <= (m.endLine||999999));
                if (inMethod && matchAnnotation(m.annotations)) return true;
            }
        }
        return false;
    }

    public clear(): void {
        this.diagnosticReporter.clear();
        this.activeViolations = [];
        this.advisoryViolations = [];
    }

    private buildClassAnnotationsMap(): Map<string, string[]> {
        const map = new Map<string, string[]>();
        for (const ast of Object.values(this.filesMap)) {
            for (const cls of ast.classes) {
                const fqcn = cls.fullyQualifiedName || cls.className;
                map.set(fqcn, (cls.annotations || []).map(a => a.name));
            }
        }
        return map;
    }
}
