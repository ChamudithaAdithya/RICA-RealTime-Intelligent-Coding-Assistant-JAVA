# RICA-V112 — Background Thread

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer` (ControllerLayer) |
| Layer | controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V306`](./RICA-V306.md) |
| Source | `src/controllerLayerDetector.ts:221` |

## Trigger

A Controller method creates or calls thread/executor types (Thread, Runnable, ExecutorService, Future, CompletableFuture, etc.) directly.

### Before (violates)

```
@RestController
public class NotificationController {
    @PostMapping("/notify")
    public void notify() {
        new Thread(() -> mailService.send()).start();
    }
}
```


### After (fixed)

```
@RestController
public class NotificationController {
    private final NotificationService notificationService;

    @PostMapping("/notify")
    public void notify() {
        notificationService.sendAsync(); // @Async inside
    }
}
```


## Why it matters

Bare threads in a controller are hard to manage: no lifecycle, no monitoring, no bounded pools, and they burden the servlet container. Spring's `@Async` or a TaskExecutor bean gives you pooled, monitored, cancellable execution and keeps the controller thin.

## How to fix

1. Replace raw thread/executor creation with `@Async` on a service method.
2. Or inject a TaskExecutor service.

## Mitigation hint

> Use Spring @Async or a TaskExecutor service instead of managing threads directly in the controller

## Tags

`threading` `async` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
