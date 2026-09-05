# RICA Architecture Analyzer

RICA helps Java developers find architecture, layer, API boundary, and design-pattern violations directly inside VS Code.

For a code-level map of extension activation, parsing, detection, diagnostics, incremental revalidation, and bundled documentation, see [Extension Code Architecture](docs/project/EXTENSION_CODE_ARCHITECTURE.md).

It is designed for projects that care about clean architecture, maintainable service boundaries, and clear separation between controllers, services, repositories, entities, DTOs, and infrastructure code.

## What RICA Does

- Detects layered architecture violations across Java projects.
- Finds controller, service, entity, repository, API, and design-pattern issues.
- Shows violations in a dedicated Architecture Violations panel.
- Opens the exact source file and line for each violation.
- Provides rule documentation with examples, highlighted changes, and fix guidance.
- Includes bundled documentation, so rule help is available from inside VS Code.

## Main Workflow

1. Open a Java workspace in VS Code.
2. Run `Java AST: Analyze Full Project`.
3. Run `Java AST: Show Architecture Violations`.
4. Review violations by severity, detector source, file, and line.
5. Use `Docs` from the violations panel to understand and resolve each issue.

## Commands

| Command | Purpose |
| --- | --- |
| `Java AST: Analyze Full Project` | Scans the full Java workspace. |
| `Java AST: Analyze Current File` | Re-analyzes only the active Java file. |
| `Java AST: Show Architecture Violations` | Opens the violations dashboard. |
| `Java AST: Export Analysis Snapshot` | Writes ASTs, dependency graph, violations, incremental maps, stats, and config as JSON. |
| `Java AST: Open RICA Documentation` | Opens the bundled RICA documentation. |
| `Java AST: Open Browser Viewer` | Opens the optional browser AST viewer when the backend is running. |
| `Java AST: Show Status` | Shows RICA status and quick actions. |
| `Java AST: Reset Backend Data` | Clears stored AST and violation state. |

## Viewing Generated Trees

After running `Java AST: Analyze Full Project`, run `Java AST: Export Analysis Snapshot`.

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

The optional backend visualizer still provides the interactive dependency graph at `http://localhost:8082/view` when the engine server is running.

## Violation Guidance

Each documented rule explains:

- what triggers the violation
- why it matters
- a violating example
- a fixed version
- what changed between the two versions
- common framework-specific cases
- how to verify the fix

For example, package boundary violations explain what to do when the issue is caused by Spring Data imports such as `@Query`, `@Modifying`, or `@Param`.

## Local Analysis

RICA's deterministic violation detection runs locally inside VS Code.

The optional browser AST viewer uses the configured backend URL. If the backend is offline, architecture violation detection still works.

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
artifacts/            Generated local inspection output
releases/             Packaged VSIX installers
```

See `src/README.md` for the source-level map. Only TypeScript source belongs in `src`; compiled JavaScript belongs in `dist`.

## Settings

RICA can be configured from VS Code settings under `javaAstAnalyzer`.

Common settings include:

- `javaAstAnalyzer.autoAnalyzeOnOpen`
- `javaAstAnalyzer.excludePatterns`
- `javaAstAnalyzer.enableArchitecturalChecks`
- `javaAstAnalyzer.enableDesignPatternChecks`
- `javaAstAnalyzer.enableBusinessLogicChecks`
- `javaAstAnalyzer.backendUrl`

## Documentation

Use `Java AST: Open RICA Documentation` to open the built-in documentation.

From the Architecture Violations panel, click `Docs` on a violation row to open the relevant rule page.
