# RICA - Code Analyzer

RICA is a Visual Studio Code extension that helps Java developers detect architecture, dependency, API boundary, package boundary, business-logic placement, and design-pattern opportunity findings while they work.

It brings architecture feedback closer to the developer by showing diagnostics directly inside VS Code, opening the affected source location, and linking each finding to rule documentation with examples and fix guidance.

For the complete installation guide, screenshots checklist, troubleshooting notes, and viva/demo workflow, see the [RICA User Manual](USER_MANUAL.md).

## What RICA Detects

- Layered architecture violations in Java projects
- Controller, service, repository, entity, DTO, and infrastructure boundary issues
- API boundary problems such as entity exposure and missing validation
- Project-wide dependency graph issues such as controller bypass, cycles, and inverted dependencies
- Package boundary violations for Clean Architecture and conventional Spring layouts
- Selected business-logic placement issues, such as business logic inside controllers/resources
- Design-pattern opportunities and structural design smells from `RICA-V301` to `RICA-V328`
- Advisory AI findings when optional AI review is enabled

## Main Features

- Inline VS Code diagnostics with severity, rule code, evidence, confidence, and explanation
- Architecture Violations panel for reviewing findings in one place
- Click-to-source navigation from each violation
- Documentation links for every RICA rule
- Concept documentation for architecture, dependency direction, DTOs, repositories, design patterns, framework classification, confidence levels, and rule tuning
- Incremental revalidation for faster feedback after file edits
- Exportable analysis snapshot containing AST facts, dependency graph, violations, stats, and configuration
- Configurable architecture profile and package boundary rules
- Local deterministic analysis that works without the optional backend

## Screenshots

Recommended Marketplace screenshots:

| Screenshot | What it should show |
| --- | --- |
| Command Palette | `Java AST` commands visible in VS Code. |
| Inline Diagnostic | A Java source file with a RICA underline and hover message. |
| Architecture Violations Panel | Rule code, severity, evidence, confidence, file, and docs button. |
| Rule Documentation | A violation page showing trigger, before/after examples, diff, how to fix, and how to verify. |
| Settings | `javaAstAnalyzer` settings such as architecture style, excluded folders, and detector toggles. |
| Analysis Snapshot | `.rica/analysis-snapshot` files showing exported AST, dependency graph, violations, and stats. |

Screenshot instructions are included in the [User Manual](USER_MANUAL.md#11-screenshot-guide).

## Quick Start

1. Install RICA from the VS Code Marketplace or from a packaged `.vsix`.
2. Open a Java project folder in VS Code.
3. Run `Java AST: Analyze Full Project` from the Command Palette.
4. Run `Java AST: Show Architecture Violations`.
5. Review each finding, open the source location, and use `Docs` for remediation guidance.

## Commands

| Command | Purpose |
| --- | --- |
| `Java AST: Analyze Full Project` | Parses and analyses the full Java workspace. |
| `Java AST: Analyze Current File` | Re-analyses only the active Java file. |
| `Java AST: Show Architecture Violations` | Opens the RICA violations panel. |
| `Java AST: Export Analysis Snapshot` | Exports ASTs, dependency graph, violations, incremental maps, stats, and config JSON. |
| `Java AST: Open RICA Documentation` | Opens the bundled RICA documentation. |
| `Java AST: Open Browser Viewer` | Opens the optional browser AST viewer when the backend is running. |
| `Java AST: Show Status` | Shows RICA status and quick actions. |
| `Java AST: Reset Backend Data` | Clears stored AST and violation state. |

## Understanding Violations

RICA findings include:

- `code`: stable rule identifier, such as `RICA-V501`
- `severity`: error, warning, or info
- `evidence`: the source fact that triggered the rule
- `reason`: short explanation of the problem
- `confidence`: how deterministic or heuristic the finding is
- `docs`: a link to the relevant rule documentation

Architecture and package-boundary findings are usually more deterministic. Design-pattern findings are intentionally advisory because a pattern opportunity still requires developer judgement.

## Handling False Positives

RICA is configurable because real Java projects use different architecture styles.

If a finding is not wrong for your project:

- choose the correct `javaAstAnalyzer.architectureStyle`
- update `javaAstAnalyzer.layerBoundaries`
- add generated/build/test/vendor folders to `javaAstAnalyzer.excludePatterns`
- disable a detector category that does not apply to the project
- treat low-confidence design-pattern findings as review suggestions rather than mandatory fixes

Inline suppression for one exact line or method is planned as future work. The current version mainly handles false positives through project configuration, exclusions, framework-aware classification, confidence levels, and documentation guidance.

## Key Settings

| Setting | Purpose |
| --- | --- |
| `javaAstAnalyzer.autoAnalyzeOnOpen` | Automatically analyses a Java workspace when opened. |
| `javaAstAnalyzer.architectureStyle` | Selects `auto`, `conventional-spring`, or `clean` architecture interpretation. |
| `javaAstAnalyzer.excludePatterns` | Excludes generated, build, test, vendor, or irrelevant folders. |
| `javaAstAnalyzer.enableArchitecturalChecks` | Enables cross-file architecture rules. |
| `javaAstAnalyzer.enableDesignPatternChecks` | Enables design-pattern opportunity rules from `RICA-V301` to `RICA-V328`. |
| `javaAstAnalyzer.enableBusinessLogicChecks` | Enables selected business-logic placement rules. |
| `javaAstAnalyzer.layerBoundaries` | Customises package-to-layer mapping and allowed dependencies. |
| `javaAstAnalyzer.backendUrl` | Configures the optional backend/browser viewer URL. |
| `javaAstAnalyzer.enableAiAdvisory` | Enables optional AI advisory findings. |

## Exporting AST And Dependency Evidence

After running `Java AST: Analyze Full Project`, run:

```text
Java AST: Export Analysis Snapshot
```

RICA writes the current internal analysis structures to:

```text
.rica/analysis-snapshot/
```

The snapshot includes:

- `all-asts.json`
- `asts/*.ast.json`
- `dependency-graph.json`
- `violations.json`
- `incremental-maps.json`
- `stats.json`
- `config.json`
- `full-snapshot.json`

This is useful for debugging false positives, preparing evaluation evidence, and demonstrating how RICA builds AST and dependency graph facts.

## Documentation

Use `Java AST: Open RICA Documentation` to open the bundled documentation.

From the Architecture Violations panel, click `Docs` on a violation row to open the matching rule page.

Each rule page explains:

- what triggers the violation
- when it is probably real
- when it may be a false positive
- violating and fixed examples
- highlighted diff
- why the fix helps
- how to verify the fix

## Optional Backend And AI Advisory

Local deterministic violation detection works without the backend.

The optional browser AST viewer requires the configured backend URL, defaulting to:

```text
http://localhost:8082
```

AI advisory mode is optional and disabled by default. Deterministic RICA analysis remains available without sending source code to an external AI provider. Teams should review privacy requirements before enabling AI advisory mode for commercial or private codebases.

## Running From Source

```powershell
git clone https://github.com/ChamudithaAdithya/RICA-RealTime-Intelligent-Coding-Assistant-JAVA.git
cd RICA-RealTime-Intelligent-Coding-Assistant-JAVA
npm install
npm run compile
```

Then open the project in VS Code and press `F5`. A new Extension Development Host window opens. In that window, open a Java project and run `Java AST: Analyze Full Project`.

## Packaging

```powershell
npm install
npm run compile
npx vsce package
```

Install the generated `.vsix` from VS Code:

1. Open the Extensions view.
2. Select `...`.
3. Choose `Install from VSIX...`.
4. Pick the generated package.
5. Reload VS Code if prompted.

## Known Limitations

- RICA detects selected architecture, boundary, business-logic placement, and design-pattern issues. It does not claim to prove every possible business rule.
- Some design-pattern findings are advisory because static analysis cannot always infer design intent perfectly.
- Full IFDS-based authorization and taint-flow tracing remains future work.
- The browser AST viewer is unavailable when the optional backend is offline.
- Inline suppression for a single exact finding is planned as future work.

## Project Structure

```text
src/
  extension.ts       VS Code extension entry point and composition root
  analyzers/         Java architecture and design-rule analyzers
  application/       Use cases, AI coordination, and ports
  core/              AST state, graphs, violations, impact, and rule catalog
  domain/            Shared types and analyzer configuration
  infrastructure/    Parser, VS Code, backend, file-watcher, and AI adapters
  ui/                Documentation, violations, and code-action webviews
  tooling/           Development-only source checks
  test/              Automated tests and Java fixtures
dist/                Generated JavaScript created by `npm run compile`
docs/                Documentation sources and generated VitePress frontend
engine/              Optional backend and browser visualizer
resources/           Extension icons and static resources
scripts/             Build/report tools and manual development utilities
```

For a code-level map of activation, parsing, detection, diagnostics, incremental revalidation, and documentation, see `src/README.md`.
