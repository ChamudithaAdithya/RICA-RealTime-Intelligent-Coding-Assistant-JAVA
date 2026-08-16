# RICA — Architecture Analyzer for Java

RICA (Real-time Interactive Code Analyzer) is a VS Code extension that performs
static analysis of Java projects to detect architectural violations in layered
applications. It integrates **cross-file dependency graphs**, **incremental
delta revalidation**, and a **live violations dashboard**.

---

## How to Run

### 1. VS Code Extension (Local Analysis)

Open the `rica-developerui` folder in VS Code and press `F5` to launch the
Extension Development Host. The extension activates automatically when you open
a Java file or workspace containing `*.java` files.

```bash
# From the rica-developerui directory:
npm install
npm run compile   # tsc -p ./
```

### 2. Engine Server (REST API + Visualizer)

The optional backend server provides REST endpoints and a browser-based
dependency graph visualizer.

```bash
cd engine
npm install
npm start
# Server starts on http://localhost:8082
```

Open http://localhost:8082/view to see the **Architectural Observatory** — an
interactive D3.js force-directed graph of your project's dependency topology.

The VS Code extension sends AST data to the engine automatically when the
`backendUrl` setting points to `http://localhost:8082` (the default).

---

## Supported Checks

RICA organizes its rules into three categories, each controllable via settings:

### Architectural Checks (V401–V404) — Cross-File

| Code | Rule | Detection |
|------|------|-----------|
| V401 | Controller Bypass | Controller accesses Repository directly instead of through Service |
| V402 | Cross-Layer Violation | A layer depends on a layer above it in the architecture stack |
| V403 | Cyclic Dependency | Two or more classes/modules form a dependency cycle |
| V404 | Entity Exposure | Controller accepts an Entity type as a method parameter |

These require the full dependency graph and are re-run on the blast radius
when a file changes (see Incremental Analysis below).

### Design Pattern Checks (V101–V114, V205) — Single-File

| Code | Rule | Detection |
|------|------|-----------|
| V101 | Self-Instantiation | Service/Controller/Resource directly instantiates a repository or service with `new` |
| V102 | Uninjected Repository Access | Service uses a Repository field without @Autowired / constructor injection |
| V103 | Uninjected Service Access | Controller uses a Service field without injection |
| V104 | Anemic Service | A service class contains no business logic |
| V107 | Direct Layer Access | Entity depends on a Service, Repository, or Infrastructure component |
| V109 | Improper Data Access | Entity contains data-access logic |
| V110 | Direct HTTP Call | Controller makes HTTP calls via HttpClient, RestTemplate, WebClient — should use a gateway service |
| V111 | File I/O in Controller | Controller performs file read/write operations — should use a dedicated service |
| V112 | Background Thread in Controller | Controller spawns threads or uses ExecutorService — should use @Async or TaskExecutor |
| V113 | Static Cache in Controller | Controller holds static cache/Map state — should use a scoped cache service bean |
| V114 | Raw SQL Access in Controller | Controller accesses the database directly via JDBC, JdbcTemplate, EntityManager — should go through repository |
| V205 | Direct Service Instantiation | API resource creates a service via `new` instead of injection |

### Business Logic Checks (V106, V108, V204) — Single-File

| Code | Rule | Detection |
|------|------|-----------|
| V106 | Business Logic in Controller | Controller method contains conditionals, loops, or data manipulation |
| V108 | Anemic Entity | Entity class is >80% getters/setters with no behavior |
| V204 | Business Logic in Resource | API resource method contains logic that should be in the Service layer |

### API / Resource Layer Checks (V201–V203, V206–V207) — Single-File

| Code | Rule | Detection |
|------|------|-----------|
| V201 | Exposing Internal Entity | API method returns an Entity type instead of a DTO |
| V202 | Missing DTO Usage | API parameters should use DTOs, not internal types |
| V203 | Improper Error Handling | API method exposes internal exceptions or stack traces |
| V206 | Missing Validation | API method parameter lacks @Valid, @NotNull, etc. |
| V207 | Exposing Internal Structure | API response leaks internal domain structure |

---

## Customizing Thresholds

All settings are under `File → Preferences → Settings → RICA Architecture Analyzer`.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableArchitecturalChecks` | boolean | `true` | Enable cross-file rules (V401–V404) |
| `enableDesignPatternChecks` | boolean | `true` | Enable injection/layer-access/architectural-pattern rules (V101–V114, V205) |
| `enableBusinessLogicChecks` | boolean | `true` | Enable business-logic-location rules (V106, V108, V204) |
| `businessLogicThreshold` | number (1–20) | `3` | Higher values = fewer business-logic warnings (methods must be more complex to trigger) |
| `excludePatterns` | string[] | `["**/node_modules/**", …]` | Glob patterns to exclude from analysis |
| `backendUrl` | string | `http://localhost:8082` | Engine server URL |
| `autoAnalyzeOnOpen` | boolean | `true` | Run full analysis when workspace opens |
| `debounceDelay` | number (ms) | `1000` | Edit buffer window before delta analysis |

Example `.vscode/settings.json`:

```json
{
  "javaAstAnalyzer.enableArchitecturalChecks": true,
  "javaAstAnalyzer.enableDesignPatternChecks": false,
  "javaAstAnalyzer.businessLogicThreshold": 5,
  "javaAstAnalyzer.excludePatterns": [
    "**/node_modules/**",
    "**/generated/**",
    "**/test/**"
  ]
}
```

Changes take effect immediately — the violation panel updates on the next
analysis cycle.

---

## How Real-Time Incremental Analysis Works

RICA uses a **two-tier event pipeline** to stay fast during development:

```
                    [ Developer types in editor ]
                                │
                    ┌───────────┴───────────┐
                    │                       │
              [ On Edit ]            [ On Save ]
                    │                       │
           350ms debounce            Immediate delta
                    │                       │
                    ▼                       ▼
        ┌─────────────────────────────────────┐
        │     Phase 5: Incremental Pipeline     │
        │  1. Parse only the changed file       │
        │  2. Compute signature hash            │
        │  3. Patch dependency graph            │
        │  4. BFS blast radius (dependents)     │
        │  5. Re-run cross-file only on affected│
        │  6. Merge delta → stale violations    │
        └─────────────────────────────────────┘
                    │
                    ▼
         Updated diagnostics + violation panel
```

### Key Properties

* **O(Δ) performance**: Only the changed file is re-parsed. The blast radius
  is bounded by the project's dependency depth (typically <5 hops in
  microservice modules).

* **Signature short-circuit**: If only private internals change (method body
  edits, new local variables), the public API signature hash stays the same
  and no transitive re-analysis occurs.

* **Live diagnostics**: VS Code diagnostics update in-place. The violation
  panel merges delta violations — affected file entries are replaced, all
  others are preserved.

* **Graph patching**: `patchGraphForFile()` removes old nodes/edges for the
  changed file and splices in new ones without rebuilding the full graph.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                   VS Code Extension Host                     │
│                                                              │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │ File     │  │ AST Manager │  │  Violation Manager     │   │
│  │ Watcher  │──│ (parse +    │──│  Stage 1: local detect  │   │
│  │ (350ms)  │  │  cache)     │  │  Stage 2: graph rules  │   │
│  └──────────┘  └─────────────┘  │  Phase 5: delta pipe   │   │
│                                 │  Phase 6: diagnostics  │   │
│                                 └──────────┬────────────┘   │
│                                            │                │
│  ┌──────────────────────────┐              │                │
│  │ Violations WebView Panel │◄─────────────┘                │
│  │ (ignore/unignore, sort)  │                               │
│  └──────────────────────────┘                               │
│                                            │                │
└────────────────────────────────────────────┼────────────────┘
                                             │ POST /ast/*
                                             ▼
┌────────────────────────────────────────────────────────────┐
│                   Engine Server (port 8082)                  │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ AST Store   │──│ Graph        │──│ REST API          │   │
│  │ (in-memory) │  │ Builder      │  │ /api/v1/violations│   │
│  └─────────────┘  └──────────────┘  │ /api/v1/graph     │   │
│                                      │ /api/v1/stats     │   │
│                                      └────────┬─────────┘   │
│                                               │              │
│                                      ┌────────▼─────────┐   │
│                                      │ D3.js Visualizer  │   │
│                                      │ (/view dashboard) │   │
│                                      └──────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## Commands

All commands are available via the VS Code command palette (`Ctrl+Shift+P`).

| Command | ID | Description |
|---------|----|-------------|
| Analyze Full Project | `rica.analyzeProject` | Re-scan and parse all Java files |
| Quick Scan Current File | `rica.quickScanFile` | Run delta analysis on the active file |
| Show Audit Summary | `rica.showStatusSummary` | Display error/warning/info counts |
| Open Violations Panel | `javaAstAnalyzer.showViolationsView` | View and manage violations |
| Open AST Viewer | `javaAstAnalyzer.showAstView` | Inspect the parsed AST |
| Open Browser Viewer | `javaAstAnalyzer.openBrowserViewer` | Open the engine dashboard |
| Reset Backend | `javaAstAnalyzer.resetBackend` | Clear all stored data |

---

## Diagnostic Codes

Every violation is prefixed with a diagnostic code in the format `[RICA-V###]`:

- **V100 series** — Single-file detector violations (injection, layer access)
- **V200 series** — API/Resource layer violations (DTO exposure, validation)
- **V400 series** — Cross-file architectural violations (graph-based rules)

Example diagnostic message:
```
[RICA-V102] [Error] Service class 'UserServiceImpl' has uninjected
repository field 'userDao' of type UserDao.
```

When using the VS Code diagnostics panel, the range highlights the exact
source location (column-accurate for field declarations and method calls).

---

## Ignoring Violations

The violations WebView panel (`javaAstAnalyzer.showViolationsView`) provides:

* **Ignore/Unignore buttons** in the Action column for each violation
* **Show ignored** checkbox to toggle visibility of ignored violations
* **Strikethrough styling** for ignored entries
* **Persistent storage** across VS Code restarts via `workspaceState`

---

## Development

```bash
npm run compile      # Build TypeScript → JavaScript
npm run watch        # Watch mode for development
npm run lint         # ESLint on src/

# Run test analyzers
node test-lms-analyzer.js        # 49-file LMS test (baseline)
node test-parser.js              # Parser unit tests
node test-project-analyzer.js    # Graph analysis tests
```

### Project Structure

```
rica-developerui/
├── src/
│   ├── extension.ts              # VS Code extension entry point
│   ├── violationManager.ts       # Core pipeline orchestrator
│   ├── fileWatcher.ts            # Debounced file event handler
│   ├── dependencyGraph.ts        # Graph build + SCC + 4 rules
│   ├── impactAnalyzer.ts         # Blast radius + signature hashing
│   ├── crossFileAnalyzer.ts      # Wraps graph rules as CrossFileRule
│   ├── serviceLayerDetector.ts   # Single-file: service injection checks
│   ├── controllerLayerDetector.ts# Single-file: controller injection checks
│   ├── entityLayerDetector.ts    # Single-file: entity isolation checks
│   ├── apiResourceLayerDetector.ts # Single-file: API hygiene checks
│   ├── astManager.ts             # AST parse + cache layer
│   ├── javaParser.ts             # CST→AST conversion
│   ├── astTypes.ts               # Type definitions for AST nodes
│   ├── apiClient.ts              # HTTP client to engine server
│   ├── types/
│   │   ├── violations.ts         # Unified Violation type + helpers
│   │   └── analyzerConfig.ts     # AnalyzerConfig interface + loader
│   ├── impactAnalyzer.ts
│   └── violationsWebviewPanel.ts # WebView: violation table UI
├── engine/
│   ├── server.js                 # Express REST API server
│   ├── package.json              # Server dependencies
│   └── public/
│       └── index.html            # D3.js visualizer dashboard
├── test-lms-analyzer.js          # 49-file LMS test
├── test-simlea-analyzer.js       # 757-file Simlea test
├── package.json
└── tsconfig.json
```
