# RICA — Project Status Document

## 1. Corrections to the Draft Sections

### 1.1 Pipeline Stages (Section 3.2, 6.1)

The draft describes 4 stages but **misaligns their content** and **omits 3 layer analyzers** that run in Stage 1. The actual pipeline:

```
Pre-stage: JavaParser (CST→AST, maps raw file buffers to FullASTOutput)
    │
    ▼
Stage 1 — Layer-Specific Detectors (all 4 run in parallel per file)
    ├── ServiceLayerAnalyzer    — V101–V104 (self-instantiation, uninjected repos, anemic service)
    ├── ControllerLayerAnalyzer — V106–V114 (business logic in controllers, HTTP calls, file I/O, threads, caches, raw SQL)
    ├── EntityLayerAnalyzer     — V106–V109 (business logic, layer access, anemic entity, data access)
    └── APIResourceLayerAnalyzer— V201–V207 (entity exposure, DTOs, error handling, validation, internal structure)
    │
    ▼
Stage 2 — Cross-File + Dependency Graph
    ├── buildGraphFromFiles() / patchGraphForFile()
    ├── CrossFileAnalyzer       — V401–V404 (controller bypass, cross-layer, cycles, entity exposure)
    └── ImpactAnalyzer          — Blast radius computation for delta updates
    │
    ▼
Stage 3 — Package Boundary Enforcement
    └── PackageBoundaryAnalyzer — V501 (layer isolation, allowedDeps, @Component filtering, feign prioritization)
    │
    ▼
Stage 4 — Design Pattern Compliance
    └── DesignPatternAnalyzer   — V301–V307 (Adapter, God Facade, Strategy, Factory, Singleton, Thread, Abstraction)
```

### 1.2 Inaccurate Claims

| Claim in draft | Correction |
|---|---|
| "zero-allocation orchestrator" | Allocates arrays (`Violation[]`), Maps (`Map<string, ...>`), and Sets throughout every rule method |
| `~450 lines` | Exactly 449 lines |
| V301: checks for "Port wrapper interface" | Checks for any adapter in infrastructure: has interfaces, name ends in `Adapter`/`Client`, or name contains the SDK's simple class name |
| V303: "class marked with @Service" | Uses `cls.detectedLayer === 'service'` (layer membership via package patterns, not annotation) |
| V304: "implements an abstract structure or interface" | More precisely: `cls.interfaces.length > 0` OR a non-trivial superClass |
| Section 6.1 diagram Stage 2 = "Controller Layer" | Stage 1 includes 4 analyzers, not just Controller. Stage 2 is Graph+CrossFile. |

### 1.3 Missing Content — What the Draft Omits

#### Engineering Fixes & Edge Cases

| Fix | File | Description |
|---|---|---|
| V501 substring fallback removed | `packageBoundaryDetector.ts:98-108` | `matchLayerByFqn` no longer substrings `"service"` against FQCN — uses exact glob |
| V501 graph path removed | `packageBoundaryDetector.ts:34` | `_graph` parameter accepted but unused; all detection is import-path-based |
| V501 feign patterns | `analyzerConfig.ts:18` | `**/feign/**`, `**/feignClient/**` added **before** `**/controller/**` so feign clients match `infrastructure` first |
| V501 @Component exclusion | `packageBoundaryDetector.ts:53-58` | Classes with only `@Component` (no `@Controller`/`@RestController`) in controller packages are excluded from `presentation` layer |
| V206 isEndpoint guard | `apiResourceLayerDetector.ts:104` | Skips V201, V203, V206 checks on private methods (`accessModifier !== 'private'`) |
| V206 @NotEmpty parsing | `javaParser.ts:2572` | `extractParameterAnnotations` updated: annotations moved from `formalParameter.children.annotation` to `formalParameter → variableParaRegularParameter → variableModifier[*] → annotation` |
| V111 dedup | `controllerLayerDetector.ts:394-398` | `seen` Set deduplicates by `(type:className:methodName:line)` to squash simple-name + FQCN duplicates |
| Stale diagnostic on undo | `violationManager.ts:248-250` | `packageBoundaryAnalyzer.analyze()` moved **outside** `if (sigChanged)` guard — runs on every `onFileSaved()` |

#### Unimplemented / Dead Rule Codes

| Code | Status |
|---|---|
| V104 (`anemic-service`) | Defined in `RULE_CODE_MAP`, **never emitted** — `ServiceLayerAnalyzer` only produces `self-instantiation`, `uninjected-repository-access` |
| V105 (`package-violation`) | Defined in `RULE_CODE_MAP`, **never emitted** — produced by `PackageBoundaryAnalyzer` under `RICA-V501` code instead |
| V109 (`improper-data-access`) | Defined in `RULE_CODE_MAP`, **never emitted** — `EntityLayerAnalyzer` does not produce this type |
| V202 (`missing-dto-usage`) | Defined in `RULE_CODE_MAP`, **never emitted** — `APIResourceLayerAnalyzer` does not produce this type |
| V203 (`improper-error-handling`) | Defined in `RULE_CODE_MAP`, **never emitted** — `APIResourceLayerAnalyzer` does not produce this type |
| V207 (`exposing-internal-structure`) | Defined in `RULE_CODE_MAP`, **never emitted** — `APIResourceLayerAnalyzer` does not produce this type |

#### Infrastructure Components Not Mentioned

- **`ImpactAnalyzer`** (`impactAnalyzer.ts`): Computes transitive blast radius from dependency maps; enables the delta-scoped re-validation in `onFileSaved()`
- **`DependencyGraph`** (`dependencyGraph.ts`): `buildGraphFromFiles()` full rebuild, `patchGraphForFile()` incremental patch. Tracks incoming/outgoing class edges with metadata
- **`CrossFileAnalyzer`** (`crossFileAnalyzer.ts`): Graph rules V401–V404; runs only on files in the blast radius
- **`filterByConfig()`** (`violationManager.ts:376-400`): Gates violations by `enableArchitecturalChecks`, `enableDesignPatternChecks`, `enableBusinessLogicChecks` flags

#### Violation ID Generation Strategy

Each analyzer uses a unique ID scheme:
- **Layer detectors**: `{detectorSource}-{className}-{methodName|fieldName}-{type}-{line}`
- **CrossFileAnalyzer**: `{detectorSource}-{className}-{type}-{line}`
- **PackageBoundaryAnalyzer**: `rica-v501-{className}-{timestamp}-{random}`
- **DesignPatternAnalyzer**: `DP-{ruleType}-{filePath}-{methodName|fieldName}-{line}`

---

## 2. Accurate Full System Description (for insertion into the draft)

### 2.1 Section 3 — Progress Summary (Corrected)

#### 3.1 Tasks Completed

The Real-Time Intelligent Coding Assistant (RICA) has been implemented as a fully operational static analysis backend engine. The architecture pivoted from an offline batch model into an event-driven delta pipeline inside the VS Code extension process. The following subsystems are complete:

- **JavaParser**: Tree-sitter based CST→AST normalization producing structured `FullASTOutput` with classes, methods, attributes, imports, annotations, `createdObjects`, `calledMethods`, and `complexityMetrics`
- **4 Layer-Specific Analyzers**: `ServiceLayerAnalyzer`, `ControllerLayerAnalyzer`, `EntityLayerAnalyzer`, `APIResourceLayerAnalyzer` — each enforcing ~4–9 rules targeted to their architectural layer
- **Dependency Graph**: `ProjectDependencyGraph` with `buildGraphFromFiles()` and `patchGraphForFile()` for incremental graph maintenance
- **CrossFileAnalyzer**: Graph-based rules (V401–V404) scanning for controller bypass, cross-layer violations, cycles, and entity exposure
- **ImpactAnalyzer**: Transitive blast radius computation for delta-scoped re-validation
- **PackageBoundaryAnalyzer**: Layer isolation via directory-to-boundary matching with exact glob, feign prioritization, and @Component exclusion
- **DesignPatternAnalyzer**: 7 GoF rules (V301–V307) for adapter, facade, strategy, factory, singleton, thread safety, and abstraction compliance
- **ViolationManager**: Orchestrator with `update()` (full rebuild) and `onFileSaved()` (delta) paths, config gating, and diagnostic reporting

#### 3.2 Current Stage Pipeline

**Stage 1 — Layer-Specific Detectors**: All 4 analyzers run per-file on both full rebuilds and deltas. Together they cover V101–V207.

**Stage 2 — Dependency Graph + Cross-File**: On signature changes, `patchGraphForFile()` updates the graph incrementally. `CrossFileAnalyzer` runs only on the computed blast radius (not the full workspace).

**Stage 3 — Package Boundary**: `PackageBoundaryAnalyzer` runs on every save (not gated by signature change) to ensure V501 violations survive undo/redo cycles.

**Stage 4 — Design Pattern**: `DesignPatternAnalyzer` runs on every save when `enableDesignPatternChecks` is true, using the full AST cache and graph for cross-file lookups.

#### 3.3 Evidence of Progress

- **`src/designPatternAnalyzer.ts`** (449 lines): 7 GoF rules with semantic safeguards for Lombok `@Builder`, `@Configuration`-class thread exemption, and service-layer bounding for strategy checks
- **`src/violationManager.ts`** (417 lines): Delta pipeline with `onFileSaved()` and full rebuild with `update()`, config gating, and diagnostic reporting
- **`src/packageBoundaryDetector.ts`** (156 lines): Layer matching via glob, FQCN-to-layer via package-path projection, `@Component`-in-controller exclusion
- **`src/domain/analyzerConfig.ts`** (20 lines): Configurable `layerBoundaries` with `allowedDeps` per layer; feign/repository patterns preconfigured
- **`src/domain/violations.ts`** (52 lines): Unified `Violation` type with `detectorSource` union including all 7 analyzer identifiers

### 2.2 Section 5 — Methodology (Additions)

#### 5.2 Tools, Techniques, Technologies

- **Tree-sitter (Java grammar)**: Used for CST→AST parsing via `javaParser.ts`. Avoids heavyweight Java tooling by running grammar matching directly in the Node.js process
- **Glob-based Layer Matching**: `simpleGlobMatch()` converts `**/controller/**` patterns to regex for fast file-to-layer classification — no filesystem traversal needed
- **Incremental Graph Patch**: `patchGraphForFile()` compares old/new AST imports and does O(diff) edge updates rather than rebuilding the entire graph
- **Blast Radius Isolation**: `ImpactAnalyzer.computeBlastRadius()` walks `dependents` map to scope Stage 2 re-analysis to transitively affected files only

### 2.3 Section 6 — Implementation Progress (Expanded Rule Table)

#### 6.2 Complete Rules Matrix

| Code | Rule Name | Analyzer | Type | Threshold | Safeguards |
|---|---|---|---|---|---|
| V101 | Self-Instantiation | ServiceLayer | Design | any `new X()` | N/A |
| V102 | Uninjected Repository | ServiceLayer | Design | any uninjected `Repository` field | N/A |
| V103 | Uninjected Service | ServiceLayer | Design | any uninjected `Service` field | N/A |
| V106 | Controller Business Logic | ControllerLayer | Business | logic score ≥ threshold | N/A |
| V110 | Direct HTTP Call | ControllerLayer | Business | any `HttpClient`, `RestTemplate`, etc. | N/A |
| V111 | File I/O in Controller | ControllerLayer | Business | any `File`, `InputStream`, etc. | N/A |
| V112 | Background Thread in Controller | ControllerLayer | Business | `Thread`, `Executor`, etc. | N/A |
| V113 | Static Cache in Controller | ControllerLayer | Business | `HashMap`, `ConcurrentHashMap` cache fields | checks `cache`/`store`/`pool`/`buffer` in field name |
| V114 | Raw SQL in Controller | ControllerLayer | Business | `DataSource`, `JdbcTemplate`, `EntityManager` | N/A |
| V106/V108 | Entity Business Logic / Anemic Entity | EntityLayer | Business | logic score ≥ threshold, or zero methods | N/A |
| V107 | Direct Layer Access from Entity | EntityLayer | Architectural | `Service`/`Controller` import | N/A |
| V201 | Exposing Internal Entity | APIResourceLayer | Architectural | Entity return type in public method | private methods skipped |
| V204 | Business Logic in Resource | APIResourceLayer | Business | logic score ≥ threshold | N/A |
| V205 | Direct Service Instantiation | APIResourceLayer | Design | `new ServiceImpl()` | N/A |
| V206 | Missing Validation | APIResourceLayer | Design | missing `@Valid`, `@NotNull`, etc. | private methods skipped |
| V301 | Adapter Missing | DesignPattern | Structural | external SDK import in domain/application | adapter check via interfaces, name patterns |
| V302 | God Facade | DesignPattern | Structural | in-degree ≥ 8, LOC ≥ 500, ≥60% delegation | N/A |
| V303 | Strategy Missing | DesignPattern | Behavioral | ≥4 if-else on same variable, or ≥4 switch-case | **service layer only** |
| V304 | Factory Missing | DesignPattern | Creational | same `new` from ≥3 callers, target has interface | skips `*Builder*` types |
| V305 | Mutable Singleton | DesignPattern | Creational | `static` non-`final` HashMap, ArrayList, etc. | N/A |
| V306 | Raw Thread Spawn | DesignPattern | Behavioral | `new Thread()`, `Executors.execute()` | **skips** `@Configuration` classes |
| V307 | Missing Abstraction | DesignPattern | Structural | interface/abstract with exactly 1 implementation | N/A |
| V401 | Controller Bypass | CrossFile | Architectural | service→repository without controller | graph-based |
| V402 | Cross-Layer Violation | CrossFile | Architectural | illegal layer→layer dependency | graph-based |
| V403 | Cyclic Dependency | CrossFile | Architectural | SCCs in dependency graph | graph-based |
| V404 | Entity Exposure | CrossFile | Architectural | entity type leaked through public API | graph-based |
| V501 | Package Boundary Violation | PackageBoundary | Architectural | layer imports disallowed layer | @Component exclusion, feign prioritization |

### 2.4 Section 8 — Challenges (Additions to 8.1)

4. **The Undo/Redo Stale Diagnostic Bug (`V501`):** When a user undid a change that had previously introduced a package boundary violation, the violation persisted in the diagnostic panel. The root cause was that `PackageBoundaryAnalyzer.analyze()` was gated behind the `if (sigChanged)` guard in `onFileSaved()`. Since undoing a single-line import change does not alter a class's public signature, `sigChanged` returned `false` and the analyzer was skipped. **Fix:** Moved the `PackageBoundaryAnalyzer` call outside the `sigChanged` guard — it now executes on every file-save event regardless of signature changes.

5. **The Parameter Annotation Blind Spot (`V206`):** The tree-sitter CST for Java method parameters restructured between grammar versions. `@NotEmpty` and `@RequestParam` annotations moved from `formalParameter.children.annotation` to `formalParameter → variableParaRegularParameter → variableModifier[*] → annotation`. The old extraction code returned an empty array, causing all `V206` missing-validation checks to silently pass. **Fix:** Updated `extractParameterAnnotations` in `javaParser.ts` to traverse the new CST path.

6. **The Private Helper Method Noise (`V206, V203, V201`):** Private helper methods inside API resource classes were being flagged for missing validation, error handling, and entity exposure — even though private methods are never part of the public API surface. **Fix:** Added `isEndpoint = method.accessModifier !== 'private'` guard; endpoint-specific checks (V201, V203, V206) now skip non-public methods.

### 2.5 Section 9 — Revised Work Plan (Add)

The following rule codes are defined in the code registry but have **no emitter** — they represent known gaps for future implementation:

- **V104 Anemic Service**: Service classes should contain business logic, not just pass-through delegations
- **V109 Improper Data Access**: Entities should not access repositories or databases
- **V202 Missing DTO Usage**: API methods should use DTOs instead of domain entities
- **V203 Improper Error Handling**: API methods should declare or catch exceptions
- **V207 Exposing Internal Structure**: API return types should not be internal domain objects
- **V105 Package Violation** (old code): Replaced by V501; remove from `RULE_CODE_MAP`

---

## 3. Key Architectural Decisions Record

| Decision | Rationale |
|---|---|
| Layer detectors run on every file in `onFileSaved()` (not scoped by blast radius) | These are O(1) per file and don't need graph data; scoping adds complexity for no perf gain |
| `PackageBoundaryAnalyzer` runs outside `sigChanged` guard | Fixes stale diagnostic on undo; import-only edits don't change class signature |
| Graph not rebuilt on every delta — `patchGraphForFile()` does O(diff) edge updates | Full rebuild on every save would be O(n) in project size; patch is O(changedImports) |
| Design pattern rules inline in one 449-line file (not one file per rule) | Avoids N+1 file reads, keeps all GoF thresholds visible in one place; split only if rules exceed ~15 |
| Violation IDs are **not stable** across runs for `PackageBoundaryAnalyzer` (includes `Date.now()` + random) | V501 violations lack a stable class-name anchor; this is a known weakness for the "ignore" feature |
| No taint-tracking or control-flow graph (CFG) yet | CFG construction from tree-sitter CST is complex; deferred to post-submission roadmap |
