# Configuration Reference

The analyzer is a VS Code extension; each setting lives under `javaAstAnalyzer.*` and can also be driven programmatically through `AnalyzerConfig`.

## Rule toggles

| Config key (`AnalyzerConfig`) | VS Code setting | Rules affected |
| --- | --- | --- |
| `enableArchitecturalChecks` | `javaAstAnalyzer.enableArchitecturalChecks` | V401–V404, V501 (cross-file + boundaries) |
| `enableDesignPatternChecks` | `javaAstAnalyzer.enableDesignPatternChecks` | V101–V103, V105(where applicable), V205, V301–V307 |
| `enableBusinessLogicChecks` | `javaAstAnalyzer.enableBusinessLogicChecks` | V104, V106, V108, V204 |

## Detection tuning

| Setting | Default | Meaning |
| --- | --- | --- |
| `businessLogicThreshold` | `3` | Score at which a method is considered to contain "significant business logic" (V106, V108, V204). The score comes from `javaParser.ts` (`businessLogicScore`), built from body text operators, LOC, and cyclomatic complexity. |
| `excludePatterns` | `**/node_modules/**`, `**/build/**`, … | Glob patterns skipped during graph analysis. |
| `layerBoundaries` | domain/application/infrastructure/presentation map | Package patterns + allowed dependency layers used by V501. |

## Advisory / AI features

`enableAiAdvisory` (default off) turns on the non-blocking advisory layer. Its findings annotate deterministic violations (as `RICA-V000`) and never delete them. Providers: `ollama` or `openai-compatible`.

::: tip
The docs deep-link (`documentationBaseUrl`, default `http://localhost:5173`) controls the base URL the violations webview uses when you click **Docs** on a violation row. Point it at your deployed VitePress site.
:::

## Related

The authoritative list of every code is the [Rule Matrix](../rule-matrix.md).