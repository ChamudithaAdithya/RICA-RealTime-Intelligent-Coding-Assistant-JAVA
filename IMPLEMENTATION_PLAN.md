# RICA Implementation Plan

## Goal
Build RICA into a Real-Time Intelligent Coding Assistant that detects:
- architectural violations
- design-pattern misuse
- business-logic issues

It must work across the whole Java project, not just a single file, and must update only the affected connected region when code changes.

---

## Overview
This plan is organized into phases and implementation areas.
It covers:
1. AST and semantic model improvement
2. parser and layer analysis enhancements
3. cross-file dependency graph and project-wide analysis
4. incremental impact-based revalidation
5. enhanced diagnostics and UX
6. backend/visualization support
7. configuration, documentation, and tests

---

## Phase 1: Strengthen the AST and semantic model

### What to implement
- Enhance `rica-developerui/src/astTypes.ts` to ensure the AST model covers:
  - exact node locations (`startLine`, `startColumn`, `endLine`, `endColumn`)
  - field/parameter injection markers (`isInjected`)
  - method body metrics (`linesOfCode`, `cyclomaticComplexity`, `businessLogicScore`)
  - call graphs and dependency metadata (`calledMethods`, `createdObjects`, `accessedFields`)
  - class-level layer metadata (`detectedLayer`, `stereotypes`, package/module heuristics)

### Why
- precise diagnostics require exact source ranges.
- intelligent architectural checks depend on explicit semantic data, not just names.
- cross-file checks need type and dependency metadata across classes and files.

---

## Phase 2: Improve Java parsing and layer classification

### What to implement
- Extend `rica-developerui/src/javaParser.ts` to parse additional semantics:
  - annotation metadata for fields, methods, constructors, parameters
  - receiver expressions for method calls
  - object instantiation class names and constructor argument types
  - method-body control structures and complexity indicators
  - field and parameter injection detection: `@Autowired`, `@Inject`, `@Resource`, constructor/setter injection
  - richer package-based and naming heuristics for layer detection
  - full `Relationship[]` output for `extends`, `implements`, `has-a`, `uses`, `inner-class`, and `calls`

### Why
- the current parser already builds ASTs, but it must expose deeper behavioral information for pattern and architecture detection.
- better layer classification improves the quality of controller/service/entity violation rules.

---

## Phase 3: Add cross-file dependency graph and project-wide analysis

### What to implement
- Create `rica-developerui/src/dependencyGraph.ts` or similar module.
- Build a full project-level graph from every file:
  - file → imports
  - class → declared types
  - class → called classes/methods
  - class → instantiated classes
  - dependency edges between files and classes
- Use graph data to support cross-file analyzers.

### Why
- architectural violations and design-pattern misuse are often visible only across files.
- a graph allows detection of issues like:
  - controller directly using repository or entity classes in another file
  - service depending on controller classes
  - API resources returning internal entity types instead of DTOs
  - package boundary violations and layer crossing

---

## Phase 4: Add a cross-file analyzer

### What to implement
- Add `rica-developerui/src/crossFileAnalyzer.ts` or `architectureViolationDetector.ts`.
- Detect violations that require whole-project context:
  - improper dependencies across layers
  - layer boundary violations between packages
  - design pattern misuse across collaborators
  - resource/DTO/API contract issues spanning multiple files
  - service/controller/entity/DTO rules that involve other files
- Integrate it into `ric-developerui/src/violationManager.ts` alongside existing detectors.

### Why
- current detectors are mostly local to one file.
- a dedicated cross-file analyzer is the missing piece for real architecture analysis.

---

## Phase 5: Add incremental path-based revalidation

### What to implement
- Extend `ASTManager` in `rica-developerui/src/astManager.ts` to maintain:
  - `projectAstMap: Map<string, FullASTOutput>`
  - `projectGraph` or dependency maps
- On file change:
  - parse the changed file
  - update that file's graph edges
  - compute impacted files using graph traversal (`dependents[X]` and transitive closure)
  - rerun relevant detectors for impacted files and classes only
- Maintain both:
  - `dependencies[file] = Set(files this file depends on)`
  - `dependents[file] = Set(files that depend on this file)`
- Add `impactAnalyzer.ts` if needed to compute affected file sets.

### Why
- a single changed file can cause violations in connected files.
- whole-project reanalysis on every change would be too slow.
- graph-based impact analysis keeps the assistant responsive and correct.

---

## Phase 6: Improve diagnostics and live feedback

### What to implement
- Refine `rica-developerui/src/violationManager.ts` so diagnostics use real source ranges.
- Provide clear severity, source, and issue codes for each violation.
- Add user-facing suggestions in diagnostic messages.
- Improve `rica-developerui/src/fileWatcher.ts`:
  - support save and debounced edit events
  - trigger incremental analysis path from the changed file to dependents
- Add `extension.ts` features:
  - commands for full project scan, quick file scan, and status summary
  - status bar text like “AST: connected, 15 files analyzed, 4 impacted”

### Why
- real-time assistance needs fast, accurate diagnostics.
- developers need immediate feedback on both local and propagated violations.
- exact ranges make warnings actionable.

---

## Phase 7: Backend and visualization support

### What to implement
- Enhance `engine/server.js` to optionally store and expose:
  - violation snapshots
  - project dependency graph metadata
  - impacted file sets
- Add backend endpoints such as:
  - `GET /violations`
  - `POST /violations`
  - `GET /graph`
- Improve the browser viewer on `/view` to show:
  - active violations
  - dependency connections
  - rule categories and severity
  - cross-file violation details

### Why
- the backend can become a central place to review architecture issues.
- visualization improves understanding of connected violations and project structure.

---

## Phase 8: Configuration and documentation

### What to implement
- Add VS Code settings in `rica-developerui/package.json`:
  - `javaAstAnalyzer.enableArchitecturalChecks`
  - `javaAstAnalyzer.enableDesignPatternChecks`
  - `javaAstAnalyzer.enableBusinessLogicChecks`
  - `javaAstAnalyzer.businessLogicThreshold`
  - `javaAstAnalyzer.excludePatterns`
- Document the assistant in `rica-developerui/READMEv2.md` or new docs:
  - how to run backend and extension
  - what checks are supported
  - how to customize thresholds
  - how real-time incremental analysis works

### Why
- configuration is needed to tune rule behavior.
- good documentation helps adoption.

---

## Phase 9: Testing and validation

### What to implement
- Add parser/unit tests in `rica-developerui/src/test/` for:
  - injection detection
  - method call extraction
  - object creation extraction
  - location/range accuracy
- Add analyzer tests for:
  - controller/service/entity violations
  - cross-file architectural rule detection
  - business logic placement
  - DTO/API/resource contract checks
- Add sample Java fixtures covering:
  - correct architecture
  - architectural violations
  - design-pattern misuse
  - entity/business logic anti-patterns

### Why
- this analyzer is complex and needs strong regression protection.
- tests ensure the assistant stays accurate as rules evolve.

---

## Implementation roadmap

### Step A: Foundation
- Harden AST metadata in `astTypes.ts`
- Enhance AST extraction in `javaParser.ts`
- Add stronger layer detection and annotation handling

### Step B: Graph + cross-file detection
- Build `dependencyGraph.ts`
- Add `crossFileAnalyzer.ts`
- Integrate cross-file rules into `violationManager.ts`

### Step C: Incremental reanalysis
- Update `astManager.ts` to track graph state
- Add impacted-file computation
- Trigger revalidation on related files only

### Step D: Real-time diagnostics
- Fix diagnostic ranges in `violationManager.ts`
- Improve watcher and status behavior
- Add extension commands for scan and status

### Step E: Backend and UI
- Enhance `engine/server.js`
- Add violation and graph endpoints
- Improve `/view` visuals if needed

### Step F: Docs and tests
- Document the architecture and settings
- Add test coverage and sample cases

---

## Key design principles

1. **Project-wide first**
   - do a full scan and build the dependency graph before trusting results.

2. **Cross-file violation detection**
   - detect issues by analyzing connected files, not isolated ASTs.

3. **Incremental revalidation**
   - recheck only impacted files after change, using dependency paths.

4. **Precise diagnostics**
   - use actual AST source ranges and meaningful messages.

5. **User configurability**
   - provide settings for which rule families should run.

6. **Backend support for history and visualization**
   - use the backend to store snapshots, graph data, and violation summaries.

---

## Example workflow

1. user opens workspace
2. backend starts on `http://localhost:8082`
3. extension performs full project scan
4. dependency graph is computed across all Java files
5. all detectors run, including cross-file architecture and pattern checks
6. diagnostics appear in Java editors
7. user edits one file
8. changed file is reparsed, graph updates, impacted files are recomputed
9. only affected detectors run for the impacted region
10. diagnostics update in real time

---

## Files to add or modify

- `rica-developerui/src/astTypes.ts`
- `rica-developerui/src/javaParser.ts`
- `rica-developerui/src/dependencyGraph.ts`
- `rica-developerui/src/crossFileAnalyzer.ts`
- `rica-developerui/src/impactAnalyzer.ts` (optional)
- `rica-developerui/src/astManager.ts`
- `rica-developerui/src/violationManager.ts`
- `rica-developerui/src/fileWatcher.ts`
- `rica-developerui/src/extension.ts`
- `engine/server.js`
- `rica-developerui/package.json`
- `rica-developerui/READMEv2.md`
- `rica-developerui/src/test/*`

---

## Phase 10: AST Infrastructure Expansion (data-flow & graph metrics)

### What to implement
- Extend `rica-developerui/src/infrastructure/javaParser.ts` method-body analysis:
  - `persistenceWrites`: calls whose receiver variable's resolved type is a persistence type (`*Repository`, `*DAO`, `EntityManager`, `JdbcTemplate`, `Session`, `MongoTemplate`, `*Mapper`). In-memory ops (`list.remove()`, `map.delete()`) must NOT qualify — matching is typed, never name-global.
  - Recursively unwrap method-chaining to the base receiver so `repository.saveAndFlush(entity).getId()` registers the write on `repository`.
  - `writtenVariables`: assignment targets inside a method body.
- Extend `rica-developerui/src/domain/astTypes.ts`:
  - `MethodBodyInfo` gains `persistenceWrites: { call: string; line: number }[]` and `writtenVariables: string[]`.
- Extend `rica-developerui/src/dependencyGraph.ts`:
  - Add real `getFanIn()` / `getFanOut()` per class based on type-call edges, and rewire V302 God Facade to use them instead of raw `getIncomingEdges().length`.

### Why
- Missing Command (V310) needs to know whether a method sequences multiple typed persistence writes.
- V302 precision improves by distinguishing incoming type-call edges from generic dependency edges.
- Feeds Phase 11 rules without duplicating parse passes.

---

## Phase 11: Design Pattern Analyzer Expansion (V308, V309, V310)

### What to implement (all in `rica-developerui/src/designPatternAnalyzer.ts`)
- Add `DP_RULE_CODES` / `DP_MITIGATIONS` entries + `toViolation` severity wiring:
  - **V308 Leaking Construction Logic** (`warning`): flag `new ConcreteType(args)` whose constructor/init statement count exceeds the threshold inside a business method. Guards: skip anonymous class bodies and builder cascades (`.builder()`, `*Builder`).
  - **V309 Fat Interface / ISP** (`warning`): declared method count > `fatInterfaceMethodCount` OR implementing-class usage ratio < `fatInterfaceUsageRatio`. Guards: only project-internal interfaces (defined in parsed files, not framework/SDK/`java.*`); resolve inherited methods through interface `extends` when computing the ratio.
  - **V310 Missing Command** (`warning`): method with `>=2 distinct persistenceWrites` AND cyclomatic complexity `>= 6`. Guard: exempt `@Transactional` methods (declarative boundary is the accepted mechanism; avoids flagging standard CRUD orchestration).

### Why
- Closes the last three matrix gaps (Leaking Construction, Fat Interface, Missing Command) with type-aware, low-false-positive detection.

---

## Phase 12: System Integration & Verification

### What to implement
- Register V308–V310 in `rica-developerui/src/violationManager.ts` catalogs/severity maps.
- Expose thresholds in `rica-developerui/package.json`:
  - `javaAstAnalyzer.designPatternThresholds.constructionStatements`
  - `javaAstAnalyzer.designPatternThresholds.fatInterfaceMethodCount`
  - `javaAstAnalyzer.designPatternThresholds.fatInterfaceUsageRatio`
- Update `RICA_VIOLATION_LIST.md` (Total Codes: 35 -> 38) with V308–V310 rows.
- Add fixture unit tests in `rica-developerui/src/test/designPattern.test.js`, including negative cases:
  - fluent builder cascades (no V308)
  - anonymous `Runnable` / `Comparator` (no V308)
  - framework/third-party interface implementations (no V309)
  - `@Transactional` CRUD orchestration (no V310)

### Verification gates
- `npx tsc -p ./` clean
- `npx mocha` all existing + new tests pass

---

## Final recommendation
This plan is designed to turn the repository into a true real-time intelligent assistant.
The most important addition is the project-level dependency graph and incremental cross-file revalidation, because architectural and design-pattern violations almost always span multiple files.

Start by building the graph and extending the parser, then layer in the cross-file analyzer and impact-based update path.
