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

### Violating example

```
@RestController
public class NotificationController {
    @PostMapping("/notify")
    public void notify() {
        new Thread(() -> mailService.send()).start();
    }
}
```


### Fixed version

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


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class NotificationController {
+     private final NotificationService notificationService;
+
      @PostMapping("/notify")
      public void notify() {
-         new Thread(() -> mailService.send()).start();
+         notificationService.sendAsync(); // @Async inside
      }
  }
```


## Why it matters

Bare threads in a controller are hard to manage: no lifecycle, no monitoring, no bounded pools, and they burden the servlet container. Spring's `@Async` or a TaskExecutor bean gives you pooled, monitored, cancellable execution and keeps the controller thin.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Concurrency and resource boundaries](../concepts/concurrency-boundaries.md) - Understand why threads, executors, sockets, connections, and heavyweight resources need ownership boundaries.
- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Replace raw thread/executor creation with `@Async` on a service method.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Or inject a TaskExecutor service.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V112 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Use Spring @Async or a TaskExecutor service instead of managing threads directly in the controller

## Tags

`threading` `async` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
