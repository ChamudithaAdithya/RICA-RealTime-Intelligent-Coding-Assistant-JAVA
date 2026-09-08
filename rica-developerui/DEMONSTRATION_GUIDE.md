# RICA Demonstration Guide

This guide explains how to demonstrate the full RICA project to a supervisor or examination panel. It covers the project aim, extension usage, codebase walkthrough, detector workflow, documentation workflow, test evidence, evaluation evidence, and likely viva questions.

## 1. Demonstration Goal

The goal of the demonstration is to show that RICA is a working Visual Studio Code extension for Java architecture analysis.

By the end of the demo, the panel should understand that RICA:

- parses Java source files into structured AST facts
- classifies Java classes into architectural roles
- builds dependency information across files
- detects architecture, API boundary, package boundary, business-logic placement, and design-pattern opportunity findings
- reports findings inside VS Code using diagnostics
- provides an Architecture Violations panel
- links every rule to documentation
- supports incremental revalidation after edits
- exports AST, dependency graph, violation, configuration, and statistics evidence
- supports optional AI advisory through Ollama or an OpenAI-compatible API

## 2. What To Prepare Before The Demo

Prepare these before meeting the panel:

- RICA source code opened in VS Code
- packaged RICA `.vsix`
- Extension Development Host working with `F5`
- one clean Java test project
- one violation-heavy Java test project
- one real Java/Spring project, such as the Simlea backend
- terminal opened at the RICA extension root
- screenshots or evidence logs for test execution
- final report and presentation ready

Useful commands:

```powershell
npm install
npm run compile
npm test
npm run test:projects
npm run docs:build
npx vsce package
```

If `npm run test:analyzers` fails on PowerShell because of quoting, use:

```powershell
npx mocha --grep "LayerAnalyzer|Multi-layer" src/test/analyzers.test.js
```

## 3. Recommended Demo Order

Use this order in the viva. It keeps the demo clear and easy to follow.

1. Explain the research problem.
2. Show RICA installed/running in VS Code.
3. Run full project analysis.
4. Show inline diagnostics in Java code.
5. Open the Architecture Violations panel.
6. Open a rule documentation page.
7. Show a design-pattern opportunity warning.
8. Show configuration and false-positive handling.
9. Export the analysis snapshot.
10. Run automated tests.
11. Walk through the source code architecture.
12. Explain limitations and future work.

## 4. Opening Statement

Use this short explanation:

> RICA is a real-time intelligent code architecture analyzer for Java projects in VS Code. The problem it addresses is that architecture erosion, layer boundary violations, API boundary mistakes, and design-pattern opportunities are often not visible during normal coding. RICA brings this feedback into the IDE by combining AST-based static analysis, dependency graph reasoning, deterministic rules, documentation, and optional AI advisory support.

## 5. Research Gap Explanation

Use this wording:

> The research gap is not that existing tools cannot analyze Java code. Tools such as Checkstyle, PMD, SpotBugs, SonarQube, and ArchUnit are already useful. The gap is that many tools focus on general bugs, style rules, security checks, isolated code smells, or test-time architecture assertions. RICA focuses on developer-friendly IDE feedback for architecture-related issues that appear across files, packages, layers, API boundaries, dependency directions, business-logic placement, and selected design-pattern decisions.

## 6. Project Contribution

Explain the contribution as:

- a working VS Code extension for Java architecture diagnostics
- a deterministic analysis engine based on AST facts
- project-level dependency graph checks
- configurable package boundary analysis
- design-pattern opportunity detection
- documentation-driven diagnostics
- incremental revalidation
- exportable analysis evidence
- optional AI-ready advisory context

Do not overclaim that RICA proves every business rule or automatically fixes every architecture issue.

## 7. How To Launch The Extension From Source

From the RICA project root:

```powershell
npm install
npm run compile
```

Then:

1. Open the RICA repository in VS Code.
2. Press `F5`.
3. A new Extension Development Host window opens.
4. In that new window, open a Java project.
5. Run `Java AST: Analyze Full Project`.

Explain:

> This is how extension developers test a VS Code extension before publishing it. The Extension Development Host runs the current local extension code.

## 8. How To Install The VSIX

After packaging:

```powershell
npx vsce package
```

Install it:

1. Open VS Code.
2. Go to Extensions.
3. Select `...`.
4. Choose `Install from VSIX...`.
5. Pick the generated `.vsix`.
6. Reload VS Code.
7. Open a Java project and run RICA commands.

Explain:

> The VSIX is the installable extension package. It is similar to what Marketplace users receive when they install the extension.

## 9. Main Commands To Demonstrate

| Command | What to show |
| --- | --- |
| `Java AST: Analyze Full Project` | Scans the Java workspace and runs RICA analysis. |
| `Java AST: Analyze Current File` | Re-analyzes the active Java file. |
| `Java AST: Show Architecture Violations` | Opens the main violation review panel. |
| `Java AST: Export Analysis Snapshot` | Exports ASTs, dependency graph, violations, stats, and config. |
| `Java AST: Open RICA Documentation` | Opens bundled documentation. |
| `Java AST: Show Status` | Shows RICA status summary. |
| `Java AST: Reset Backend Data` | Clears stored AST/violation state. |

## 10. Extension Usage Demo

Open a Java project with known violations.

Run:

```text
Java AST: Analyze Full Project
```

Then show:

- RICA status bar change
- completion notification
- Problems panel diagnostics
- warning/error underlines in Java editor
- hover message with rule code and explanation

Say:

> RICA reports violations as native VS Code diagnostics, so the developer does not need to leave the IDE or run a separate external report.

## 11. Architecture Violations Panel Demo

Run:

```text
Java AST: Show Architecture Violations
```

Show these fields:

- rule code
- severity
- detector source
- confidence
- evidence
- reason
- file path
- line number
- documentation button

Say:

> The panel is useful because architecture problems are project-level. A developer can review all findings together instead of searching through separate editor underlines.

## 12. Documentation Demo

Click `Docs` from a violation row.

Show that each rule page contains:

- what triggers the violation
- why it matters
- when it is probably real
- when it may be a false positive
- violating example
- fixed example
- highlighted diff
- how to fix
- how to verify
- related concepts

Say:

> RICA is documentation-driven. Each detector emits a stable rule code, and that rule code maps to generated documentation from the rule catalogue. This makes the tool educational as well as diagnostic.

## 13. Screenshot Demo Checklist

Capture or show these during the demo:

| Screenshot | Where to get it |
| --- | --- |
| Command Palette | `Ctrl+Shift+P`, search `Java AST`. |
| Analyze Project result | Run `Java AST: Analyze Full Project`. |
| Inline diagnostic | Open a violating Java file and hover over an underline. |
| Architecture Violations panel | Run `Java AST: Show Architecture Violations`. |
| Rule documentation | Click `Docs` on a violation row. |
| Concept documentation | Open Clean Architecture, DTO, Strategy, or Package Boundaries page. |
| Settings | Open VS Code Settings and search `javaAstAnalyzer`. |
| Analysis snapshot | Run `Java AST: Export Analysis Snapshot`. |
| Test output | Run `npm test` or `npm run test:projects`. |

## 14. Codebase Walkthrough

Use this sequence when showing source code.

### 14.1 Extension Entry Point

File:

```text
src/extension.ts
```

Explain:

- activates the extension
- creates output channel and status bar
- reads VS Code settings
- registers commands
- wires parser, AST manager, violation manager, diagnostics, file watcher, docs webview, and AI advisory
- handles full project analysis
- handles current file analysis
- exports analysis snapshot

Important functions:

| Function | Purpose |
| --- | --- |
| `activate` | Main extension startup and dependency wiring. |
| `analyzeFullProject` | Runs full workspace parsing and violation detection. |
| `analyzeSingleFile` | Runs analysis for the active Java file. |
| `exportAnalysisSnapshot` | Writes `.rica/analysis-snapshot` evidence. |
| `createAiCoordinator` | Creates the optional AI advisory pipeline. |

### 14.2 Parser Layer

Main files:

```text
src/infrastructure/javaParser.ts
src/infrastructure/javaParserAdapter.ts
src/domain/astTypes.ts
```

Explain:

- parses Java source code
- extracts packages, imports, classes, annotations, methods, fields, method calls, object creations, inheritance, interfaces, and source locations
- classifies common Java/Spring roles such as controller, service, repository, entity, DTO, config, and API resource
- provides facts used by all analyzers

Key point:

> RICA does not replace `javac`. It extracts practical AST facts needed for fast editor feedback.

### 14.3 AST Manager

File:

```text
src/core/astManager.ts
```

Explain:

- stores parsed AST outputs
- manages cached AST data
- supports full project parsing
- supports changed-file analysis
- provides cached ASTs to the violation manager

### 14.4 Violation Manager

File:

```text
src/core/violationManager.ts
```

Explain:

- coordinates all analyzers
- keeps deterministic and advisory violations
- builds or refreshes project graph information
- updates diagnostics
- supports ignored/active violation state
- uses impact analysis for incremental revalidation

Key point:

> The violation manager is the central coordinator between parsed program facts, detectors, and VS Code diagnostics.

### 14.5 Layer Detectors

Files:

```text
src/analyzers/controllerLayerDetector.ts
src/analyzers/serviceLayerDetector.ts
src/analyzers/entityLayerDetector.ts
src/analyzers/repositoryLayerDetector.ts
src/analyzers/apiResourceLayerDetector.ts
```

Explain each:

| Detector | Purpose |
| --- | --- |
| Controller detector | Finds controller logic problems such as direct service/repository instantiation, business logic in controllers, file I/O, raw SQL, HTTP calls, static cache, and background thread usage. |
| Service detector | Finds service-layer issues such as direct repository construction, uninjected repository access, and empty/anemic services. |
| Entity detector | Finds domain/entity issues such as persistence access or anemic entities. |
| Repository detector | Supports repository-layer checks and classification. |
| API resource detector | Finds API boundary issues such as missing DTOs, exposed entities, missing validation, improper error handling, and business logic in resources. |

Example to show:

```text
src/analyzers/controllerLayerDetector.ts
```

Say:

> This detector checks whether a controller is staying thin. It should receive requests, validate/delegate, and return responses, not perform persistence, file handling, external calls, or business workflows directly.

### 14.6 Cross-File And Dependency Graph Analysis

Files:

```text
src/core/dependencyGraph.ts
src/analyzers/crossFileAnalyzer.ts
```

Explain:

- builds relationships between Java classes/files
- detects problems that cannot be seen in one file alone
- supports controller bypass, cross-layer violation, cycles, and entity exposure

Say:

> Architecture erosion often appears through relationships between files. That is why RICA uses dependency graph reasoning in addition to local AST checks.

### 14.7 Package Boundary Analyzer

File:

```text
src/analyzers/packageBoundaryDetector.ts
```

Explain:

- checks whether packages depend on allowed layers
- supports Clean Architecture and conventional Spring layouts
- uses configurable layer boundaries
- uses framework-aware classification to reduce false positives

Important setting:

```json
"javaAstAnalyzer.architectureStyle": "auto"
```

### 14.8 Design Pattern Analyzer

File:

```text
src/analyzers/designPatternAnalyzer.ts
```

Explain:

- detects selected design-pattern opportunities and design smells
- covers `RICA-V301` to `RICA-V328`
- uses conservative heuristics
- reports warnings/advisory findings because design intent cannot always be proven statically

Examples:

| Rule | Pattern/opportunity |
| --- | --- |
| `RICA-V303` | Strategy candidate from repeated discriminator branches. |
| `RICA-V304` | Factory candidate from direct concrete creation. |
| `RICA-V310` | Command candidate for multi-step write workflow. |
| `RICA-V316` | State candidate for scattered state checks. |
| `RICA-V323` | Bridge candidate for combinatorial hierarchy explosion. |
| `RICA-V324` | Mediator candidate for heavy peer coordination. |
| `RICA-V328` | Interpreter candidate for repeated rule/query parsing logic. |

Say:

> These findings are not forcing design patterns everywhere. They identify symptoms where a pattern may reduce coupling, duplication, or responsibility leakage.

### 14.9 Incremental Revalidation

Files:

```text
src/core/impactAnalyzer.ts
src/infrastructure/fileWatcher.ts
src/core/violationManager.ts
```

Explain:

- RICA watches Java file changes
- detects what type of AST facts changed
- reruns only affected rule groups where possible
- uses dependency/dependent information for cross-file impact

Say:

> This improves editor responsiveness because RICA does not need to blindly re-run the full project analysis after every small edit.

### 14.10 Diagnostics And VS Code UI

Files:

```text
src/infrastructure/vscodeDiagnosticReporter.ts
src/ui/violationsWebviewPanel.ts
src/ui/codeActionProvider.ts
src/ui/documentationCodeActionProvider.ts
```

Explain:

- converts RICA findings into VS Code diagnostics
- shows warning/error/info underlines
- provides documentation code actions
- displays the Architecture Violations panel
- supports guidance actions where safe

### 14.11 Documentation System

Files:

```text
src/core/violationCatalog.ts
scripts/generate-docs.cjs
src/ui/documentation.ts
src/ui/documentationWebviewPanel.ts
docs/
```

Explain:

- `violationCatalog.ts` is the source of truth for rule documentation
- `generate-docs.cjs` generates rule pages, matrix, and concept maps
- `documentation.ts` resolves documentation routes
- `documentationWebviewPanel.ts` displays bundled VitePress docs inside VS Code

Say:

> Documentation is connected to rule codes, so the user can move from a diagnostic to the exact explanation and fix guidance.

### 14.12 AI Advisory Layer

Files:

```text
src/application/ai/aiAdvisoryCoordinator.ts
src/application/ai/triage.ts
src/application/ai/contextBuilder.ts
src/application/ai/heuristicAdvisor.ts
src/infrastructure/ai/ollamaAiAdapter.ts
src/infrastructure/ai/openaiCompatibleAiAdapter.ts
src/infrastructure/ai/fileAuditLogger.ts
```

Explain:

- AI is optional
- deterministic rules do the main detection
- AI advisory can review selected ambiguous/business-rule-adjacent findings
- supports Ollama and OpenAI-compatible APIs
- does not delete deterministic findings
- writes audit evidence when enabled

Safe defence wording:

> RICA does not depend on AI for core detection. AI is used as an optional advisory layer over structured diagnostic context.

### 14.13 Configuration

File:

```text
package.json
src/infrastructure/vscodeConfigProvider.ts
src/domain/analyzerConfig.ts
```

Explain:

- `package.json` contributes settings and commands to VS Code
- `VscodeConfigProvider` reads user/workspace settings
- `AnalyzerConfig` defines the internal config shape

Important settings to show:

```json
{
  "javaAstAnalyzer.architectureStyle": "auto",
  "javaAstAnalyzer.enableArchitecturalChecks": true,
  "javaAstAnalyzer.enableDesignPatternChecks": true,
  "javaAstAnalyzer.enableBusinessLogicChecks": true,
  "javaAstAnalyzer.excludePatterns": [
    "**/target/**",
    "**/build/**",
    "**/generated/**",
    "**/test/**"
  ]
}
```

## 15. Rule Categories To Explain

Use this table in the demo:

| Category | Code range | Purpose |
| --- | --- | --- |
| Layer-specific rules | `RICA-V101` to `RICA-V114` | Controller, service, repository, entity, and business-logic placement checks. |
| API boundary rules | `RICA-V201` to `RICA-V207` | DTO, validation, resource, error-handling, and entity exposure checks. |
| Design-pattern rules | `RICA-V301` to `RICA-V328` | Design-pattern opportunities and structural design smells. |
| Cross-file graph rules | `RICA-V401` to `RICA-V404` | Project-wide dependency and architecture relationship checks. |
| Package boundary rules | `RICA-V501` | Configurable layer/package dependency enforcement. |
| AI advisory | `RICA-V000` | Optional advisory findings from AI or heuristic review. |

## 16. Demonstrating A Real Finding

Example flow:

1. Open a controller with direct repository access.
2. Show the underline.
3. Hover over the diagnostic.
4. Open Architecture Violations panel.
5. Click the row.
6. Click `Docs`.
7. Explain how to fix.

Say:

> The important part is not just detecting the issue. RICA also shows evidence and explains why the architecture rule matters.

## 17. Demonstrating A False Positive Workflow

Use a finding from a real Spring project.

Explain:

> Static analysis can produce false positives because real projects use different conventions. RICA reduces this using framework-aware classification, architecture profiles, configurable layer boundaries, excluded paths, confidence metadata, and documentation sections explaining when a finding may be false positive.

Show settings:

```json
"javaAstAnalyzer.architectureStyle": "conventional-spring"
```

or:

```json
"javaAstAnalyzer.excludePatterns": [
  "**/target/**",
  "**/generated/**",
  "**/test/**"
]
```

Mention:

> Inline suppression for one exact finding is a planned future improvement.

## 18. Demonstrating AST And Dependency Graph Export

Run:

```text
Java AST: Export Analysis Snapshot
```

Open:

```text
.rica/analysis-snapshot/
```

Show:

```text
all-asts.json
asts/*.ast.json
dependency-graph.json
violations.json
incremental-maps.json
stats.json
config.json
full-snapshot.json
README.md
```

Explain:

> These files prove that RICA is not just displaying warnings. It builds structured AST and graph data internally, and this command exports those structures for inspection and evaluation.

Also mention:

> RICA creates `.rica/.gitignore` so generated JSON files do not pollute the user's Git changes.

## 19. Test And Evaluation Demo

Run:

```powershell
npm run compile
npm test
npm run test:projects
```

Explain:

- unit tests verify parser and detector behaviour
- regression tests protect against false positives found in real projects
- controlled test projects check expected rule coverage
- real project scans show how RICA behaves outside synthetic examples

Good explanation:

> The controlled projects verify that known violations are detected. Real project scans are used to identify false positives and improve detector precision.

## 20. Test Projects

Typical controlled projects:

| Project | Purpose |
| --- | --- |
| `rica-clean` | Expected to produce no violations. Used to test quiet behaviour. |
| `rica-violations-heavy` | Contains seeded layer/API/package violations. |
| `rica-structural` | Contains deterministic design-pattern opportunity examples. |
| Simlea backend or another real Spring project | Used for real-world behaviour and false-positive analysis. |

Explain clearly:

> The seeded projects are controlled evaluation fixtures. They are not enough alone for precision/recall claims, so real-project scanning is also used as supporting evaluation evidence.

## 21. AI Advisory Demo

Only demonstrate this if configured.

Settings:

```json
{
  "javaAstAnalyzer.enableAiAdvisory": true,
  "javaAstAnalyzer.aiProvider": "openai-compatible",
  "javaAstAnalyzer.aiEndpoint": "https://api.openai.com",
  "javaAstAnalyzer.aiApiKey": "YOUR_API_KEY",
  "javaAstAnalyzer.aiModel": "gpt-4o-mini",
  "javaAstAnalyzer.aiTrigger": "onDemand"
}
```

Explain:

> AI advisory is optional. It can explain or review selected findings, but deterministic RICA rules remain the main detection mechanism.

Privacy note:

> For commercial code, teams should decide whether source snippets can be sent to an external provider. RICA keeps AI optional so local deterministic analysis can run without external calls.

## 22. What Not To Claim

Avoid saying:

- RICA detects every possible business-logic violation.
- RICA fully implements IFDS data-flow analysis.
- RICA automatically fixes every architecture issue.
- Every design-pattern warning is definitely a bug.
- RICA replaces SonarQube, PMD, SpotBugs, Checkstyle, or ArchUnit.

Say instead:

- RICA detects selected, explainable architecture and design-quality issues.
- RICA uses deterministic AST and graph-based rules.
- IFDS-based authorization and taint-flow tracing is future work.
- Design-pattern findings are opportunities for developer review.
- RICA complements existing tools by focusing on IDE-based architecture feedback.

## 23. Limitations And Future Work

Mention these honestly:

- full IFDS-based authorization and taint-flow tracing is future work
- inline suppression for exact findings is future work
- deeper Java semantic resolution could reduce more false positives
- large-scale benchmark precision/recall evaluation can be expanded
- design-pattern detection remains advisory because design intent is difficult to prove statically
- AI advisory requires privacy-aware configuration

Good wording:

> The final implementation focuses on the central research contribution: real-time architecture feedback inside VS Code. Deeper IFDS-style data-flow and larger benchmark evaluation remain future work because they require more complex semantic modelling and evaluation design.

## 24. Likely Viva Questions And Answers

### Why did you build a VS Code extension?

Because architecture issues should be shown during development, not only after code review or CI. VS Code diagnostics allow developers to see the issue in context.

### Why use AST analysis?

AST analysis gives structured facts such as classes, methods, fields, annotations, imports, calls, and object creation. This is more accurate than text search.

### Why use dependency graph analysis?

Some architecture issues appear across files. For example, a controller may indirectly bypass a service layer, or services may form cycles. A dependency graph allows RICA to reason about relationships.

### Why not only use existing tools?

Existing tools are useful, but RICA focuses specifically on developer-friendly architecture and design-pattern feedback inside VS Code, with direct documentation links.

### Does RICA detect business-logic violations?

RICA detects selected business-logic-related issues where static evidence is available, such as business logic placed in controllers/resources, missing validation, raw access, and advisory authorization cases. It does not claim to detect every domain-specific business rule.

### Does RICA implement IFDS?

No. The proposal discussed IFDS-style analysis for deeper business-logic constraints. The final implementation uses AST facts, dependency graph reasoning, and deterministic rules. Full IFDS authorization and taint-flow tracing is future work.

### Is AI required?

No. AI is optional. Core detection is deterministic and testable. AI can be used as an advisory layer for explanation or remediation support.

### How do you handle false positives?

RICA uses framework-aware classification, architecture profiles, configurable package boundaries, exclude patterns, confidence metadata, documentation guidance, and regression tests from real-project findings.

### Why are design-pattern findings warnings?

Because static analysis cannot always prove design intent. RICA reports design-pattern findings as opportunities or design smells for developer review.

### How do you prove RICA works?

Through automated tests, controlled Java test projects, real-project scans, exported analysis snapshots, and live VS Code demonstration.

## 25. Final Demo Closing Statement

Use this:

> RICA demonstrates that architecture analysis can be moved closer to the developer's everyday workflow. It combines AST-based static analysis, dependency graph reasoning, rule-based detection, documentation, incremental revalidation, and optional AI advisory support. The result is a working developer tool that helps identify architecture erosion and design-quality issues earlier, while still presenting findings with evidence and allowing developer judgement.

## 26. Emergency Demo Checklist

If time is short, show only these:

1. Run `Java AST: Analyze Full Project`.
2. Show inline diagnostic.
3. Show Architecture Violations panel.
4. Open rule documentation.
5. Export analysis snapshot.
6. Run `npm test`.
7. Explain code structure from `src/extension.ts`, `src/analyzers`, `src/core`, `src/ui`, and `src/application/ai`.

## 27. Useful Commit Message For This Guide

```text
docs: add supervisor demonstration guide for RICA
```
