# RICA-V301 — Adapter Missing

<Badge type="danger" text="Error" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingAdapter` (DesignPatternAnalyzer) |
| Layer | domain / application |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V110`](./RICA-V110.md) |
| Source | `src/designPatternAnalyzer.ts:242` |

## Trigger

A file in the `domain` or `application` layer directly imports an external SDK (AWS SDK, Kafka, Netty, OkHttp, Retry, etc.) and no corresponding adapter/client exists in the infrastructure layer.

### Violating example

```
// domain/OrderNotifier.java
import software.amazon.awssdk.services.sns.SnsClient;

public class OrderNotifier {
    public void send(String message) {
        SnsClient client = SnsClient.create();
        client.publish(...);
    }
}
```


### Fixed version

```
// application/Port
public interface NotificationPort {
    void send(String message);
}
// infrastructure/Adapter
public class SnsNotificationAdapter implements NotificationPort {
    private final SnsClient client;
    public void send(String message) { client.publish(...); }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- // domain/OrderNotifier.java
- import software.amazon.awssdk.services.sns.SnsClient;
-
- public class OrderNotifier {
-     public void send(String message) {
-         SnsClient client = SnsClient.create();
-         client.publish(...);
-     }
+ // application/Port
+ public interface NotificationPort {
+     void send(String message);
  }
+ // infrastructure/Adapter
+ public class SnsNotificationAdapter implements NotificationPort {
+     private final SnsClient client;
+     public void send(String message) { client.publish(...); }
+ }
```


## Why it matters

External vendor code is volatile and owned by someone else. Importing it straight into the core couples your business logic to the vendor. An Adapter/Port pattern keeps the core depending on an interface that infrastructure implements, so vendors can be swapped without touching domain logic.

## Common framework cases

### External SDK type leaks into application code

**When you see this:** Application/service code imports vendor SDK classes, HTTP response models, payment SDK objects, or cloud client request/response types.

**Do this:**

1. Define a local port/interface that says what the application needs.
2. Implement the port in an infrastructure adapter using the SDK.
3. Map SDK request/response objects to local DTOs or domain values at the adapter boundary.

**Avoid:** Do not let vendor classes become method parameters or return types in business services.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Define a Port interface in the application layer describing only what the core needs.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Implement an Adapter/Client in the infrastructure layer that wraps the vendor SDK.**
   This keeps the code aligned with the domain / application responsibility expected by RICA-V301.
3. **Inject the port into the domain/application code.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V301 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Wrap the external dependency behind a Port interface in application/port/out/ and create an Adapter implementation in infrastructure/adapter/

## Tags

`adapter` `hexagonal` `port` `clean-architecture`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
