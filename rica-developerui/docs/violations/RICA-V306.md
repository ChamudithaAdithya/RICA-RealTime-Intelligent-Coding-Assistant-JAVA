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

### Before (violates)

```
@Service
public class ReportService {
    public void generateAsync() {
        new Thread(() -> generate()).start(); // unmanaged thread
    }
}
```


### After (fixed)

```
@Service
public class ReportService {
    public void generate() { ... }

    @Async
    public void generateAsync() { generate(); } // managed by executor bean
}
```


## Why it matters

Raw thread management bypasses the container: no pooling, no monitoring, no graceful shutdown, no task distribution on a multi-node deployment. Use a managed executor so concurrency is bounded and observable.

## How to fix

1. Inject a `TaskExecutor`/`ExecutorService` bean instead of creating threads.
2. Or annotate the method with `@Async` and call it through the container proxy.
3. Never spawn bare threads from controllers or services.

## Mitigation hint

> Use @Async or a TaskExecutor bean instead of managing threads directly — this gives lifecycle management and monitoring

## Tags

`thread` `executor` `async` `concurrency`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
