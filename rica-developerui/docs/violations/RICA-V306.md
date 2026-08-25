# RICA-V306 - Raw Thread Spawn

<Badge type="danger" text="Error" />

> **Stage**: Stage 4 - Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkRawThread` (DesignPatternAnalyzer) |
| Layer | any (outside @Configuration) |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V112`](./RICA-V112.md) |
| Source | `src/designPatternAnalyzer.ts:94` |

## Trigger

Code creates a raw thread/executor type (`new Thread`, `Executors.*`, `new ThreadPoolExecutor`) or calls `Executors.execute()` directly, outside of `@Configuration` classes.

### Violating example

```
@Service
public class ReportService {
    public void generateAsync() {
        new Thread(() -> generate()).start(); // unmanaged thread
    }
}
```


### Fixed version

```
@Service
public class ReportService {
    public void generate() { ... }

    @Async
    public void generateAsync() { generate(); } // managed by executor bean
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Service
  public class ReportService {
-     public void generateAsync() {
-         new Thread(() -> generate()).start(); // unmanaged thread
-     }
+     public void generate() { ... }
+
+     @Async
+     public void generateAsync() { generate(); } // managed by executor bean
  }
```


## Why it matters

Raw thread management bypasses the container: no pooling, no monitoring, no graceful shutdown, no task distribution on a multi-node deployment. Use a managed executor so concurrency is bounded and observable.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Concurrency and resource boundaries](../concepts/concurrency-boundaries.md) - Understand why threads, executors, sockets, connections, and heavyweight resources need ownership boundaries.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `any (outside @Configuration)`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Design-pattern rules are heuristic. They detect strong design smells, not absolute proof. Prefer a small refactor only when the pattern removes real duplication, coupling, or lifecycle risk.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Inject a `TaskExecutor`/`ExecutorService` bean instead of creating threads.**
   This makes the dependency explicit and lets the container supply it, which improves testability and keeps object lifecycle out of business code.
2. **Or annotate the method with `@Async` and call it through the container proxy.**
   This gives threading lifecycle to the framework or infrastructure layer instead of scattering it through business methods.
3. **Never spawn bare threads from controllers or services.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V306 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Use @Async or a TaskExecutor bean instead of managing threads directly - this gives lifecycle management and monitoring

## Tags

`thread` `executor` `async` `concurrency`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
