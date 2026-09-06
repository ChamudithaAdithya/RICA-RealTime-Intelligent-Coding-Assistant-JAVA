# RICA User Manual

RICA is a Visual Studio Code extension for analysing Java projects for architecture, API boundary, dependency graph, package boundary, business-logic placement, and design-pattern opportunity findings.

The extension is designed to be useful for two types of users:

- developers who want immediate feedback while editing Java code
- examiners or reviewers who want to run the tool against a Java project and inspect the generated evidence

## 1. Requirements

- Visual Studio Code `1.110.0` or newer
- A Java project opened as a VS Code workspace
- Node.js and npm only if running RICA from source
- The optional browser AST viewer requires the RICA backend service, but normal violation detection works locally without the backend

## 2. Install From VS Code Marketplace

Use this path after RICA is published to the Marketplace.

1. Open Visual Studio Code.
2. Open the Extensions view.
3. Search for `RICA - Code Analyzer`.
4. Select the extension published by `Geeth-Chamuditha-Adithya-Herath`.
5. Click `Install`.
6. Open a Java project folder.
7. Wait for automatic analysis, or run `Java AST: Analyze Full Project` from the Command Palette.

## 3. Install From VSIX

Use this path when you have a packaged `.vsix` file.

1. Open Visual Studio Code.
2. Open the Extensions view.
3. Click the `...` menu.
4. Select `Install from VSIX...`.
5. Choose the generated RICA `.vsix` file.
6. Reload VS Code if prompted.
7. Open a Java project folder.
8. Run `Java AST: Analyze Full Project`.

## 4. Run From Source

Use this path if someone downloads the GitHub repository and wants to run the extension in development mode.

```powershell
git clone https://github.com/ChamudithaAdithya/RICA-RealTime-Intelligent-Coding-Assistant-JAVA.git
cd RICA-RealTime-Intelligent-Coding-Assistant-JAVA
npm install
npm run compile
```

Then:

1. Open the RICA project folder in VS Code.
2. Press `F5`.
3. VS Code opens a new Extension Development Host window.
4. In that new window, open the Java project you want to analyse.
5. Run `Java AST: Analyze Full Project`.

## 5. First Analysis Workflow

1. Open a Java project in VS Code.
2. Run `Ctrl+Shift+P`.
3. Search for `Java AST: Analyze Full Project`.
4. Run the command.
5. Open the problems list or run `Java AST: Show Architecture Violations`.
6. Click a violation row to open the source location.
7. Click `Docs` to understand the rule and recommended fix direction.

## 6. Main Commands

| Command | What it does |
| --- | --- |
| `Java AST: Analyze Full Project` | Parses and analyses the full Java workspace. |
| `Java AST: Analyze Current File` | Analyses only the active Java file. |
| `Java AST: Show Architecture Violations` | Opens the RICA violations panel. |
| `Java AST: Export Analysis Snapshot` | Exports AST, dependency graph, violation, stats, and config JSON files. |
| `Java AST: Open RICA Documentation` | Opens bundled RICA documentation. |
| `Java AST: Open Browser Viewer` | Opens the optional browser viewer when the backend is running. |
| `Java AST: Show Status` | Shows current extension status and quick actions. |
| `Java AST: Reset Backend Data` | Clears stored AST and violation state. |

## 7. Reading A Violation

Each finding should be reviewed using these fields:

| Field | Meaning |
| --- | --- |
| Code | Stable RICA rule identifier, such as `RICA-V501`. |
| Severity | `error`, `warning`, or `info`. |
| Evidence | The exact import, call, type, annotation, or source relationship that triggered the rule. |
| Reason | Short explanation of why the rule was reported. |
| Confidence | How deterministic the finding is. Architecture/package rules are usually higher confidence; design-pattern opportunities are usually advisory. |
| Docs | Opens the rule documentation with examples and fix guidance. |

## 8. What To Do With A Finding

Use this decision path:

1. Read the violation message and evidence.
2. Open the documentation page.
3. Check whether the evidence is actually wrong for the project architecture.
4. If it is a real violation, refactor the code.
5. If it is acceptable for the project, tune the RICA settings or exclude the file/folder.
6. If unsure, treat the finding as a discussion point instead of blindly changing code.

Design-pattern findings are especially important to review with judgement. They indicate opportunities or design smells, not mathematical proof that a design pattern must be used.

## 9. Handling False Positives

False positives can happen in real projects because architecture rules depend on project conventions.

Common ways to reduce false positives:

- choose the correct `javaAstAnalyzer.architectureStyle`
- update `javaAstAnalyzer.layerBoundaries`
- add generated/build/test folders to `javaAstAnalyzer.excludePatterns`
- disable a detector category if it is not relevant to the project
- treat low-confidence design-pattern findings as advisory

Current useful settings:

| Setting | Purpose |
| --- | --- |
| `javaAstAnalyzer.architectureStyle` | Selects `auto`, `conventional-spring`, or `clean` architecture interpretation. |
| `javaAstAnalyzer.excludePatterns` | Excludes generated, build, test, vendor, or irrelevant folders. |
| `javaAstAnalyzer.enableArchitecturalChecks` | Enables/disables cross-file architecture rules. |
| `javaAstAnalyzer.enableDesignPatternChecks` | Enables/disables design-pattern opportunity rules. |
| `javaAstAnalyzer.enableBusinessLogicChecks` | Enables/disables selected business-logic placement rules. |
| `javaAstAnalyzer.layerBoundaries` | Customises package-to-layer mapping and allowed dependencies. |

Inline suppression for a single exact line is a recommended future improvement. At present, RICA mainly handles false positives through configuration, exclusions, confidence levels, and documentation guidance.

## 10. Exporting Evidence

Run:

```text
Java AST: Export Analysis Snapshot
```

RICA creates:

```text
.rica/analysis-snapshot/
```

Useful files:

| File | Purpose |
| --- | --- |
| `all-asts.json` | All parsed Java AST outputs. |
| `asts/*.ast.json` | Per-file AST facts. |
| `dependency-graph.json` | Project dependency graph. |
| `violations.json` | Active violations and evidence. |
| `incremental-maps.json` | Incremental revalidation maps. |
| `stats.json` | Summary statistics. |
| `config.json` | Effective RICA configuration. |
| `full-snapshot.json` | Combined snapshot for evaluation evidence. |

This snapshot is useful for research evaluation, debugging false positives, and viva demonstrations.

## 11. Screenshot Guide

The extension can be released without screenshots, but screenshots are strongly recommended for the Marketplace page, GitHub README, final report, and viva slides.

Create a folder such as:

```text
resources/screenshots/
```

Recommended screenshots:

| Screenshot file | How to capture it | Where to use it |
| --- | --- | --- |
| `01-command-palette.png` | Open `Ctrl+Shift+P` and search `Java AST`. | Marketplace, README, Chapter 4. |
| `02-analyze-project.png` | Run `Java AST: Analyze Full Project` and capture the result notification or status. | User manual, Chapter 4. |
| `03-inline-diagnostic.png` | Open a Java file with a RICA underline and hover over it. | Marketplace, report diagnostics section. |
| `04-violations-panel.png` | Run `Java AST: Show Architecture Violations` and capture the table with code, severity, evidence, confidence, and docs button. | Most important Marketplace/report screenshot. |
| `05-rule-documentation.png` | Click `Docs` on a violation and capture the rule page showing trigger, examples, diff, how to fix, and verify. | Documentation support section. |
| `06-settings.png` | Open VS Code settings and search `javaAstAnalyzer`. | User manual and appendix. |
| `07-analysis-snapshot.png` | Export the analysis snapshot and capture `.rica/analysis-snapshot` in Explorer. | Evaluation evidence. |
| `08-test-output.png` | Run `npm test` or `npm run test:projects` and capture passing output. | Chapter 5 and viva slides. |

For clean screenshots:

1. Use a Java test project with known violations.
2. Zoom VS Code to a readable level.
3. Use a light or dark theme consistently.
4. Hide unrelated sidebars or terminals unless they are part of the evidence.
5. Crop only empty space, not important fields.

## 12. AI API Key Setup

RICA can use an OpenAI-compatible API instead of Ollama for optional AI advisory review.

Add this in VS Code User Settings:

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

Use `https://api.openai.com` or `https://api.openai.com/v1` for OpenAI-style APIs. RICA normalises the endpoint internally.

Do not commit API keys into a project repository. Prefer VS Code User Settings for personal keys, and review privacy requirements before sending commercial source-code snippets to an external provider.

Then:

1. Run `Java AST: Analyze Full Project`.
2. Run the AI review command from the Command Palette.
3. Check the `Java AST Analyzer` output channel if the provider is unavailable.

## 13. Recommended Marketplace Description

Short description:

```text
RICA analyses Java projects inside VS Code for architecture, dependency, API boundary, package boundary, business-logic placement, and design-pattern opportunity findings.
```

Feature bullets:

- real-time Java architecture diagnostics
- Architecture Violations panel with evidence and confidence
- project-wide dependency graph reasoning
- package boundary checks for Clean Architecture and Spring-style projects
- design-pattern opportunity rules from `RICA-V301` to `RICA-V328`
- bundled rule and concept documentation
- exportable AST, dependency graph, violation, and statistics snapshot
- optional AI advisory workflow that does not replace deterministic analysis

## 14. Troubleshooting

| Problem | What to check |
| --- | --- |
| Command not found | Make sure the installed VSIX/Marketplace version contains the latest compiled `dist/extension.js`. Rebuild and repackage if running from source. |
| No violations appear | Run `Java AST: Analyze Full Project`, confirm Java files are not excluded, and check the output channel named `Java AST Analyzer`. |
| Too many warnings | Check `architectureStyle`, `layerBoundaries`, `excludePatterns`, and whether design-pattern advisory rules should be enabled for that project. |
| Browser viewer does not open | Start the optional backend or use local diagnostics and exported snapshots instead. |
| AI advisory does not respond | Check `enableAiAdvisory`, `aiProvider`, `aiEndpoint`, `aiApiKey`, `aiModel`, and the `Java AST Analyzer` output channel. |
| Generated code is reported | Add generated/build folders to `excludePatterns`. |
| Marketplace details look too long | The Marketplace details page is generated from `README.md`; keep README short and link this user manual for full instructions. |

## 15. Recommended First Demo

For a viva or Marketplace demo:

1. Open a controlled Java test project.
2. Run `Java AST: Analyze Full Project`.
3. Show inline diagnostics.
4. Open `Java AST: Show Architecture Violations`.
5. Click one violation.
6. Open the rule documentation.
7. Export the analysis snapshot.
8. Explain how a false positive can be handled through configuration.
