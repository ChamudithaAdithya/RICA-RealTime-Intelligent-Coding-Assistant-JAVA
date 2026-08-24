# RICA-V306 — Raw Thread Spawn

<Badge type="danger" text="Error" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

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

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Inject a `TaskExecutor`/`ExecutorService` bean instead of creating threads.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
2. **Or annotate the method with `@Async` and call it through the container proxy.**
   This gives threading lifecycle to the framework or infrastructure layer instead of scattering it through business methods.
3. **Never spawn bare threads from controllers or services.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V306 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Use @Async or a TaskExecutor bean instead of managing threads directly — this gives lifecycle management and monitoring

## Tags

`thread` `executor` `async` `concurrency`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
