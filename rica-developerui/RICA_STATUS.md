# RICA — Real-time Interactive Clean Architecture Analyzer

## What is RICA?

RICA is a **VS Code extension** that performs live, real-time architectural analysis of Java Spring Boot projects. It detects Clean Architecture violations as you type, providing pinpoint diagnostics, a D3.js visualizer dashboard, and configurable rule enforcement — all within the editor.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VS Code Extension                  │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Domain   │  │ Application  │  │ Infrastructure │ │
│  │  (pure)   │←──│   Ports      │←──│   Adapters      │ │
│  │           │  │ (interfaces) │  │                │ │
│  │ AST types │  │ ParserService│  │ JavaParser     │ │
│  │ Violations│  │ ConfigProvidr│  │ VscodeConfig   │ │
│  │ Config    │  │ DiagReporter │  │ VscodeDiagnostic│ │
│  └──────────┘  │ SourceProvide│  │ VscodeSource   │ │
│                └──────────────┘  │ ApiClientAdapter│ │
│                                  └────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │         Detectors & Analyzers                   │ │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────────┐ │ │
│  │  │ Single   │ │  Cross-File   │ │  Package     │ │ │
│  │  │ File     │ │  Graph Rules  │ │  Boundary    │ │ │
│  │  │ (4 layer)│ │  (V401-V404) │ │  (V501)      │ │ │
│  │  └──────────┘ └──────────────┘ └─────────────┘ │ │
│  └────────────────────────────────────────────────┘ │
│                              │                        │
│  ┌───────────────────────────┴────────────────────┐  │
│  │         ViolationManager (delta pipeline)      │  │
│  │  parse → patchGraph → blastRadius → scoped re- │  │
│  │  analyze → merge → refreshDiagnostics          │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (POST /ast/*)
┌──────────────────────┴──────────────────────────────┐
│              Engine Server (port 8082)               │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │ REST API │  │ Graph      │  │ D3.js Dashboard   │ │
│  │ /api/v1/ │  │ Builder    │  │ /view             │ │
│  └──────────┘  └────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Clean Architecture Layers (in RICA's own codebase)

| Layer | Directory | Framework Deps | Role |
|-------|-----------|----------------|------|
| **Domain** | `src/domain/` | **None** | Pure types — AST types, Violations, Config |
| **Application** | `src/application/ports/` | **None** | Port interfaces (contracts) |
| **Infrastructure** | `src/infrastructure/` | VS Code, Node.js | Adapters: JavaParser, VS Code APIs, HTTP client |
| **Presentation** | `src/*.ts` root | VS Code | Extension entry, commands, WebView panels |

---

## Detection Rules

### Single-File Detectors (V1xx)

| Code | Rule | Detector | Severity | Type Pattern Count |
|------|------|----------|----------|-------------------|
| V101 | Self-instantiation of service/repo | Service, Controller, API Resource | error | — |
| V102 | Uninjected repository field access | Service | error | — |
| V103 | Uninjected service field access | Controller | error | — |
| V104 | Anemic service class | Service | warning | — |
| V106 | Business logic in wrong layer | Controller, Entity | warning | — |
| V107 | Direct layer access from entity | Entity | error | — |
| V108 | Anemic entity | Entity | info | — |
| V109 | Improper data access in entity | Entity | error | — |
| **V110** | **Direct HTTP call in controller** | **Controller** | **error** | **18 patterns** |
| **V111** | **File I/O in controller** | **Controller** | **error** | **26 patterns** |
| **V112** | **Background thread in controller** | **Controller** | **warning** | **19 patterns** |
| **V113** | **Static cache in controller** | **Controller** | **warning** | **9 patterns** |
| **V114** | **Raw SQL in controller** | **Controller** | **error** | **21 patterns** |
| V201 | Exposing internal entity in API | API Resource | error | — |
| V202 | Missing DTO usage | API Resource | warning | — |
| V203 | Improper error handling | API Resource | warning | — |
| V204 | Business logic in resource | API Resource | error | — |
| V205 | Direct service instantiation | API Resource | error | — |
| V206 | Missing validation annotations | API Resource | info | — |
| V207 | Exposing internal structure | API Resource | warning | — |

### Cross-File Graph Rules (V4xx)

| Code | Rule | Method | Severity |
|------|------|--------|----------|
| V401 | Controller bypasses service → repository | BFS on dependency graph | error |
| V402 | Cross-layer violation (layer pair analysis) | Tarjan's SCC | error |
| V403 | Cyclic dependency | Tarjan's SCC | error |
| V404 | Entity exposure from controller | AST type resolution | error |

### Package Boundary Rule (V5xx)

| Code | Rule | Method | Severity |
|------|------|--------|----------|
| V501 | Layer boundary import violation | Package glob matching + import analysis | error |

---

## Key Technical Features

### 1. Delta Pipeline (O(Δ) Time)
```
onFileSaved(file):
  1. Parse changed file only
  2. Detect signature change (hash comparison)
  3. Patch dependency graph (remove old edges, add new)
  4. Compute blast radius (BFS from changed file)
  5. Run cross-file analysis only on affected files
  6. Merge with existing violations
```
- **No full rebuild** on single-file changes
- **Signature hash** = className + layer + public method sigs — cheap string equality
- **Blast radius** bounded by project dependency depth (avg < 5 hops for microservices)

### 2. Editor Integration (Phase 6)
- **Column-accurate diagnostics** via `DiagnosticRange` from AST node positions
- **File watcher**: save → immediate delta; edit → 350ms debounce
- **Status bar**: `$(warning) RICA: 47 files | 12 violations`
- **WebView panel**: sortable/filterable table, clickable file links, ignore/unignore
- **Ignored violations** persist across restarts via `workspaceState`

### 3. Constructor Injection Recognition
- `@Autowired` on fields, constructors, setters
- `@Inject`, `@Resource`
- **Lombok**: `@AllArgsConstructor`, `@RequiredArgsConstructor`, `@Builder`
- Setter injection (`@Autowired` on `setXxx()`) — marks matching field as injected

### 4. Configurable Rule Sets
| Setting | Default | Controls |
|---------|---------|----------|
| `enableArchitecturalChecks` | `true` | V401-V404 cross-file rules |
| `enableDesignPatternChecks` | `true` | V101-V114 + V201-V207 DI/pattern rules |
| `enableBusinessLogicChecks` | `true` | V106, V108, V204 |
| `layerBoundaries` | Clean Arch defaults | V501 package boundary definitions |
| `excludePatterns` | `node_modules, build, target…` | Files to skip |
| `enableAiAdvisory` | `false` | Optional AI Reasoning advisory (RICA-V000) |
| `aiProvider` | `ollama` | `off` / `ollama` / `openai-compatible` |
| `aiEndpoint` | `http://localhost:11434` | Ollama/Colab tunnel URL |
| `aiModel` | `qwen2.5-coder:7b` | Model tag served by the provider |
| `aiTrigger` | `onDemand` | `onDemand` / `onSave` / `onFullScan` |

### 6. AI Reasoning Advisory (core pipeline — M0–M5)
- **Deterministic-first**: `triage` selects AI-relevant codes + mutating-entry probes →
  `contextBuilder` pre-computes the execution path (auth annotations, privilege
  markers, distance-weighted source slices) → `heuristicAdvisor` (Option C) probes for
  missing authorization **offline** → optional LLM (`OllamaAiAdapter` /
  `OpenAICompatibleAiAdapter`) evaluates the bounded `AiContextPayload`.
- **Advisory Non-Deletion**: the coordinator annotates the same `Violation` objects
  (`aiInsights`, `quickFix`) and surfaces net-new findings as `RICA-V000` /
  `detectorSource: 'AiAdvisory'`. `enableAiAdvisory=false` or `aiProvider=off` is a
  strict no-op — today's pipeline is byte-identical.
- Every pass is appended to `.rica/ai-audit.jsonl` (`aiAuditLogEnabled`, default on).

### 5. Standalone Engine + Dashboard
```
GET /api/v1/violations?severity=error&source=ControllerLayer
GET /api/v1/graph          → nodes + edges for D3.js
GET /api/v1/stats          → file/node/edge/violation counts
GET /api/v1/history        → analysis history timeline
GET /view                  → D3.js force-directed graph dashboard
```

---

## Benchmark Results

### Test Suite
| Metric | Value |
|--------|-------|
| TypeScript source files | 40 |
| Lines of TypeScript | ~10,300 |
| Mocha unit tests | 88 (passing) |
| Pending tests | 3 |
| Cross-layer violations (self-check) | 0 |

### LMS Project (49 files — Library Management System)
| Metric | Value |
|--------|-------|
| Single-file violations | 61 |
| Cross-file violations | 0 |
| Controller bypasses | 0 |

### Simlea Project (757 files — Spring Boot Microservices)
| Metric | Value |
|--------|-------|
| Service classes | 267 |
| Controller classes | 67 |
| Entity classes | 135 |
| Repository classes | 101 |
| **Single-file violations** | **381** (58 errors, 11 warnings, 312 info) |
| **Cross-file violations** | **80** |
| **Total violations** | **461** (before PackageBoundary) |

### Input Pattern Coverage
| Pattern Category | Matched Terms |
|----------------|---------------|
| HTTP clients | `RestTemplate`, `WebClient`, `HttpClient`, `OkHttpClient`, `HttpURLConnection`, `CloseableHttpClient`, `HttpPost`, `HttpGet`, `HttpPut`, `HttpDelete` (18 total) |
| File I/O | `Files`, `Path`, `Paths`, `FileInputStream`, `FileOutputStream`, `BufferedReader`, `BufferedWriter`, `RandomAccessFile`, `FileChannel` (26 total) |
| Threading | `Thread`, `Runnable`, `Callable`, `Future`, `ExecutorService`, `Executors`, `ThreadPoolExecutor`, `CompletableFuture`, `Timer`, `TimerTask` (19 total) |
| Cache | `Cache`, `CacheManager`, `CacheBuilder`, `LoadingCache`, `Caffeine`, `Ehcache`, `RedisCacheManager` + Map types with name hints (9 total) |
| SQL/Database | `DataSource`, `Connection`, `Statement`, `PreparedStatement`, `JdbcTemplate`, `EntityManager`, `Session`, `SqlSession`, `HibernateTemplate`, `DatabaseClient`, `DriverManager` (21 total) |

---

## Current Limitations

| Limitation | Impact | Planned |
|------------|--------|---------|
| Swallowed exception detection | Empty catch `{}` blocks not flagged | Catch-block CST extraction needed |
| Try-with-resources type resolution | `conn.createStatement()` has `targetClass=undefined` | Local variable type inference |
| Business logic heuristics | V106/V108 use line-count heuristics (not full pattern matching) | Statement-level pattern analysis |
| `@Configuration` class layer | Not recognized as distinct layer | Add configuration detector |
| `@Autowired(required=false)` | Treated same as required | Info-level diagnostic for optional deps |

---

## Commands

| Command | ID | Action |
|---------|----|--------|
| Analyze Full Project | `rica.analyzeProject` | Full scan + parse + graph + all rules |
| Quick Scan File | `rica.quickScanFile` | Delta pipeline on active file |
| AI Review | `rica.aiReview` | Run the advisory AI Reasoning pass on demand |
| Show Audit Summary | `rica.showStatusSummary` | Error/warning/info counts |
| Open Violations Panel | `javaAstAnalyzer.showViolationsView` | Sortable/filterable WebView table |
| Open Browser Viewer | `javaAstAnalyzer.openBrowserViewer` | D3.js dashboard at `/view` |
| Reset Backend | `javaAstAnalyzer.resetBackend` | Clear engine server data |

---

## Quick Start

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run unit tests
npm test

# Run LMS benchmark
node test-lms-analyzer.js

# Run Simlea benchmark (requires project at E:\DevMyX\Simlea Web\backend)
node test-simlea-analyzer.js

# Self-check layer boundaries
node src/ricaLayerCheck.js

# CI gate (all of the above)
npm run rica:check:self

# Start engine server + dashboard
cd engine && node server.js
# → API at http://localhost:8082/api/v1/
# → Dashboard at http://localhost:8082/view

# Load extension in VS Code
# F5 → Extension Development Host
```

---

## Project Structure

```
rica-developerui/
├── src/
│   ├── domain/                    # Zero-dependency pure types
│   │   ├── astTypes.ts            # FullASTOutput, ClassInfo, Method, etc.
│   │   ├── violations.ts          # Violation, DiagnosticRange, ViolationSummary
│   │   ├── ai.ts                  # AiCandidate, AiContextPayload, AiDecision, audit types
│   │   └── analyzerConfig.ts      # AnalyzerConfig, LayerBoundary, AiConfig
│   ├── application/ports/         # Port interfaces (no framework deps)
│   │   ├── parserService.ts       # ParserService interface
│   │   ├── diagnosticReporter.ts  # DiagnosticReporter interface
│   │   ├── configProvider.ts      # ConfigProvider interface
│   │   ├── sourceProvider.ts      # SourceProvider interface
│   │   ├── backendService.ts      # BackendService (HTTP API) interface
│   │   ├── analyzerService.ts     # AnalyzerService interface
│   │   ├── aiDecisionProvider.ts  # LLM decision port (isAvailable/evaluate)
│   │   └── aiAuditLogger.ts       # Audit log port
│   ├── application/ai/            # AI Reasoning core (deterministic orchestration)
│   │   ├── triage.ts              # Candidate selection + entry-point probes
│   │   ├── contextBuilder.ts      # Bounded execution-path context packaging
│   │   ├── heuristicAdvisor.ts    # Option C offline auth probe (works with AI off)
│   │   └── aiAdvisoryCoordinator.ts # triage → context → advisor → LLM → merge → audit
│   ├── infrastructure/            # Adaptor implementations
│   │   ├── javaParser.ts          # JavaParser (wraps java-parser 2.x CST)
│   │   ├── javaParserAdapter.ts   # Adapter: JavaParser → ParserService
│   │   ├── vscodeDiagnosticReporter.ts
│   │   ├── vscodeConfigProvider.ts
│   │   ├── vscodeSourceProvider.ts
│   │   ├── apiClientAdapter.ts    # Adapter: HTTP client → BackendService
│   │   └── ai/                    # AI adapters
│   │       ├── ollamaAiAdapter.ts # Ollama /api/chat (format: json)
│   │       ├── openaiCompatibleAiAdapter.ts # /v1/chat/completions
│   │       ├── fileAuditLogger.ts # .rica/ai-audit.jsonl
│   │       ├── prompt.ts          # System + user prompt builders
│   │       ├── parseDecisions.ts  # Robust LLM JSON → AiDecision[]
│   │       └── httpJson.ts        # Shared http/https JSON client
│   ├── serviceLayerDetector.ts    # V101-V104 service layer rules
│   ├── controllerLayerDetector.ts # V103, V106, V110-V114 controller rules
│   ├── entityLayerDetector.ts     # V106-V109 entity rules
│   ├── apiResourceLayerDetector.ts # V201-V207 API resource rules
│   ├── crossFileAnalyzer.ts       # V401-V404 graph rule orchestrator
│   ├── packageBoundaryDetector.ts # V501 layer boundary enforcements
│   ├── dependencyGraph.ts         # Graph builder, Tarjan's SCC, BFS
│   ├── impactAnalyzer.ts          # Blast radius, signature hash
│   ├── violationManager.ts        # Delta pipeline orchestrator (ports only)
│   ├── astManager.ts              # Orchestration (ports only — no VS Code)
│   ├── fileWatcher.ts             # Save → immediate, edit → 350ms debounce
│   ├── extension.ts               # VS Code entry point, command wiring
│   ├── violationsWebviewPanel.ts  # WebView table with ignore/unignore
│   ├── webviewPanel.ts            # AST viewer WebView
│   ├── ricaLayerCheck.ts          # Self-check layer boundary script
│   └── types/                     # Re-export stubs (backward compat)
├── engine/
│   ├── server.js                  # Express server port 8082
│   └── public/
│       └── index.html             # D3.js v7 force-directed graph dashboard
├── src/test/                      # Mocha test suite
│   ├── parser.test.js             # JavaParser + injection detection
│   ├── analyzers.test.js          # All 4 layer detectors
│   ├── crossFile.test.js          # Graph rules + boundary validation
│   ├── aiAdvisory.test.js         # triage/context/heuristic/coordinator/parsing
│   └── mocks/mockAiDecisionProvider.js
├── test-lms-analyzer.js           # LMS benchmark (49 files)
├── test-simlea-analyzer.js        # Simlea benchmark (757 files)
├── package.json                   # 8 configuration settings
└── tsconfig.json                  # TS → JS (commonjs, ES2020)
```

---

## Status: Production-Ready for Pilot

RICA has been validated against **806 Java files** across 2 projects (49-file LMS + 757-file Simlea microservices) with **88 passing unit tests**, **zero type errors**, and **zero self-check violations** in Clean Architecture layering. The delta pipeline processes single-file changes in `O(Δ)` time, the D3.js dashboard provides real-time architectural visualization, and the optional AI Reasoning advisory (M0–M5 core) is implemented — deterministic triage/context/heuristic pipeline with an Ollama/OpenAI-compatible adapter and audit log; UI surface (M6: quick-fix code actions, advisory markers) is the next follow-up.
