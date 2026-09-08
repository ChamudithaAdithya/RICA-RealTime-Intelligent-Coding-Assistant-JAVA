# RICA - JAVA Code Analyzer

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.110.0%2B-007ACC)](https://code.visualstudio.com/)

RICA is a Visual Studio Code extension for real-time Java architecture analysis. It helps developers find architecture, dependency, API boundary, package boundary, business-logic placement, and design-pattern opportunity findings directly inside the editor.

Instead of waiting for a manual review or late refactoring stage, RICA shows architecture feedback while the developer is working. Each finding includes a stable RICA rule code, severity, evidence, confidence, source location, and documentation link.

## Visual Demonstrations

High-quality screenshots or GIFs should be added before the final Marketplace release.

Recommended files:

| File | What it should show |
| --- | --- |
| `resources/screenshots/01-command-palette.png` | RICA commands visible after searching `Java AST` in the Command Palette. |
| `resources/screenshots/02-inline-diagnostic.png` | A Java file with a RICA diagnostic underline and hover explanation. |
| `resources/screenshots/03-violations-panel.png` | Architecture Violations panel with rule code, severity, evidence, confidence, file, and docs button. |
| `resources/screenshots/04-rule-documentation.png` | Rule documentation page showing trigger, before/after examples, diff, how to fix, and verification steps. |
| `resources/screenshots/05-settings.png` | `javaAstAnalyzer` extension settings in VS Code. |
| `resources/screenshots/06-analysis-snapshot.png` | Exported `.rica/analysis-snapshot` files containing AST, dependency graph, violations, and stats. |

Detailed screenshot instructions are available in the [RICA User Manual](USER_MANUAL.md#11-screenshot-guide).

## Features

- Real-time Java architecture diagnostics inside VS Code
- Full project analysis and current-file analysis
- Architecture Violations panel for reviewing all findings in one place
- Click-to-source navigation from violation rows
- AST-based Java structure extraction
- Dependency graph analysis for cross-file architecture issues
- Package boundary checking for Clean Architecture and conventional Spring layouts
- API boundary rules for DTO, validation, and resource-layer issues
- Selected business-logic placement checks
- Design-pattern opportunity rules from `RICA-V301` to `RICA-V328`
- Rule documentation with violating examples, fixed examples, diffs, fix guidance, and verification steps
- Concept documentation for architecture, dependency direction, repositories, DTOs, design patterns, confidence levels, and rule tuning
- Incremental revalidation for faster feedback after edits
- Exportable AST, dependency graph, violation, configuration, and statistics snapshot
- Optional AI advisory workflow for explanation and remediation support

## What RICA Detects

RICA focuses on architecture and design-quality issues that are often missed by ordinary syntax-level checks.

| Area | Examples |
| --- | --- |
| Layer rules | Controller using repository directly, service with raw infrastructure access, entity persistence leakage. |
| API boundaries | Entity exposure, missing validation, resource/controller logic leakage. |
| Dependency graph | Controller bypass, cross-layer dependency, cyclic dependency, inverted dependency, entity exposure. |
| Package boundaries | Disallowed dependency from one configured architecture layer to another. |
| Business-logic placement | Business logic inside controllers/resources instead of service/domain layers. |
| Design patterns | Strategy, Factory, Builder, Adapter, Command, State, Observer, Decorator, Proxy, Visitor, Mediator, Memento, Iterator, Interpreter opportunities. |
| AI advisory | Optional review of selected ambiguous or business-rule-adjacent findings. |

Design-pattern findings are presented as reviewable opportunities, not automatic proof that a design pattern must be added.

## Quick Start

1. Install RICA from the VS Code Marketplace or from a `.vsix` package.
2. Open a Java project folder in VS Code.
3. Run `Java AST: Analyze Full Project`.
4. Run `Java AST: Show Architecture Violations`.
5. Select a finding to open the source location.
6. Click `Docs` to read the rule explanation and fix guidance.

## Commands

| Command | Description |
| --- | --- |
| `Java AST: Analyze Full Project` | Parses and analyses the full Java workspace. |
| `Java AST: Analyze Current File` | Re-analyses only the active Java file. |
| `Java AST: Show Architecture Violations` | Opens the RICA violations panel. |
| `Java AST: Export Analysis Snapshot` | Exports AST, dependency graph, violations, incremental maps, stats, and config JSON. |
| `Java AST: Open RICA Documentation` | Opens bundled RICA documentation. |
| `Java AST: Open Browser Viewer` | Opens the optional browser AST viewer when the backend is running. |
| `Java AST: Show Status` | Shows RICA status and quick actions. |
| `Java AST: Reset Backend Data` | Clears stored AST and violation state. |

## Extension Settings

RICA can be configured from VS Code Settings or `settings.json`.

| Setting | Default | Description |
| --- | --- | --- |
| `javaAstAnalyzer.autoAnalyzeOnOpen` | `true` | Automatically analyses a Java workspace when opened. |
| `javaAstAnalyzer.debounceDelay` | `1000` | Delay in milliseconds before analysing file changes. |
| `javaAstAnalyzer.architectureStyle` | `auto` | Architecture profile: `auto`, `conventional-spring`, or `clean`. |
| `javaAstAnalyzer.excludePatterns` | build/test defaults | Glob patterns excluded from analysis. |
| `javaAstAnalyzer.enableArchitecturalChecks` | `true` | Enables cross-file architecture rules. |
| `javaAstAnalyzer.enableDesignPatternChecks` | `true` | Enables design-pattern opportunity rules from `RICA-V301` to `RICA-V328`. |
| `javaAstAnalyzer.enableBusinessLogicChecks` | `true` | Enables selected business-logic placement rules. |
| `javaAstAnalyzer.businessLogicThreshold` | `3` | Controls sensitivity for business-logic-in-controller/resource checks. |
| `javaAstAnalyzer.layerBoundaries` | Clean/Spring defaults | Custom package-to-layer mapping and allowed dependencies. |
| `javaAstAnalyzer.backendUrl` | `http://localhost:8082` | Optional backend URL for the browser AST viewer. |
| `javaAstAnalyzer.enableAiAdvisory` | `false` | Enables optional AI advisory findings. |
| `javaAstAnalyzer.aiProvider` | `openai-compatible` | AI provider: `off`, `ollama`, or `openai-compatible`. |
| `javaAstAnalyzer.aiEndpoint` | `https://api.openai.com` | AI provider endpoint. |
| `javaAstAnalyzer.aiApiKey` | empty | Legacy settings fallback; use `RICA: Set OpenAI API Key` instead. |
| `javaAstAnalyzer.aiModel` | `gpt-4o-mini` | Model name used by the AI provider. |
| `javaAstAnalyzer.aiTrigger` | `onDemand` | AI trigger mode: `onDemand`, `onSave`, or `onFullScan`. |

Example OpenAI-compatible AI setup:

```json
{
  "javaAstAnalyzer.enableAiAdvisory": true,
  "javaAstAnalyzer.aiProvider": "openai-compatible",
  "javaAstAnalyzer.aiEndpoint": "https://api.openai.com",
  "javaAstAnalyzer.aiModel": "gpt-4o-mini",
  "javaAstAnalyzer.aiTrigger": "onDemand"
}
```

Example Agent Router setup:

```json
{
  "javaAstAnalyzer.enableAiAdvisory": true,
  "javaAstAnalyzer.aiProvider": "openai-compatible",
  "javaAstAnalyzer.aiEndpoint": "https://agentrouter.org",
  "javaAstAnalyzer.aiModel": "glm-5.3",
  "javaAstAnalyzer.aiTrigger": "onDemand"
}
```

Run `RICA: Set OpenAI API Key` from the Command Palette to store the key in VS Code Secret Storage, then run `RICA: Run AI Advisory Review`. Use an OpenAI Platform API key; a ChatGPT subscription by itself is not an API credential.

The AI pass receives only eligible deterministic findings plus a bounded execution path and source snippets. It returns a `VIOLATION`, `NO_VIOLATION`, or `AMBIGUOUS` verdict with confidence, reasoning, optional advisory findings, and an optional quick fix. Open the Architecture Violations panel to see those values in the **Analysis** column, or run `RICA: Open AI Advisory Audit Log` to inspect `.rica/ai-audit.jsonl`.

An API request is sent only when AI Advisory is enabled, the provider is reachable, and RICA finds at least one eligible candidate. If there are no candidates, RICA reports that no model request was sent.

## Requirements

RICA local deterministic analysis requires:

- Visual Studio Code `1.110.0` or newer
- A Java project opened in VS Code

Running RICA from source requires:

- Node.js
- npm

Optional features:

- The browser AST viewer requires the RICA backend service at the configured `javaAstAnalyzer.backendUrl`.
- AI advisory requires either Ollama or an OpenAI-compatible API endpoint.

## Documentation

RICA includes bundled documentation for rules and concepts.

Open documentation from:

- `Java AST: Open RICA Documentation`
- the `Docs` button in the Architecture Violations panel
- the editor lightbulb action for RICA diagnostics

Each rule page explains:

- what triggers the violation
- when the finding is probably real
- when it may be a false positive
- violating and fixed examples
- highlighted diff
- why the fix helps
- how to verify the fix

For full usage instructions, see [RICA User Manual](USER_MANUAL.md).

## Handling False Positives

Architecture rules depend on project conventions, so RICA is configurable.

If a finding is acceptable in your project:

- choose the correct `javaAstAnalyzer.architectureStyle`
- update `javaAstAnalyzer.layerBoundaries`
- add generated/build/test/vendor folders to `javaAstAnalyzer.excludePatterns`
- disable a detector category if it does not apply
- treat low-confidence design-pattern findings as advisory review items

Inline suppression for a single exact finding is planned as future work. The current version handles false positives mainly through configuration, exclusions, framework-aware classification, confidence levels, and documentation guidance.

## Exporting Evidence

Run:

```text
Java AST: Export Analysis Snapshot
```

RICA writes analysis evidence to:

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

This is useful for debugging, evaluation, research evidence, and demonstrations.

## Privacy

RICA's deterministic analysis runs locally. Source code does not need to leave the machine for normal violation detection.

AI advisory is optional and disabled by default. If enabled, diagnostic context and source snippets may be sent to the configured AI provider. Teams should review privacy and compliance requirements before enabling AI advisory for private or commercial codebases.

## Running From Source

```powershell
git clone https://github.com/ChamudithaAdithya/RICA-RealTime-Intelligent-Coding-Assistant-JAVA.git
cd RICA-RealTime-Intelligent-Coding-Assistant-JAVA
npm install
npm run compile
```

Then:

1. Open the RICA repository in VS Code.
2. Press `F5`.
3. In the Extension Development Host window, open a Java project.
4. Run `Java AST: Analyze Full Project`.

## Packaging

```powershell
npm install
npm run compile
npx vsce package
```

Install the generated `.vsix`:

1. Open the VS Code Extensions view.
2. Select `...`.
3. Choose `Install from VSIX...`.
4. Pick the generated package.
5. Reload VS Code if prompted.

## Known Issues

- RICA detects selected architecture, boundary, business-logic placement, and design-pattern issues. It does not prove every possible business rule.
- Some design-pattern findings are advisory because static analysis cannot always infer design intent perfectly.
- Full IFDS-based authorization and taint-flow tracing remains future work.
- The browser AST viewer is unavailable when the optional backend is offline.
- Inline suppression for one exact finding is planned as future work.

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

## Support

Use the GitHub issue tracker for bugs, false-positive reports, feature requests, and documentation improvements:

https://github.com/ChamudithaAdithya/RICA-RealTime-Intelligent-Coding-Assistant-JAVA/issues
