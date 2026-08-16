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

### Before (violates)

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


### After (fixed)

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


## Why it matters

External vendor code is volatile and owned by someone else. Importing it straight into the core couples your business logic to the vendor. An Adapter/Port pattern keeps the core depending on an interface that infrastructure implements, so vendors can be swapped without touching domain logic.

## How to fix

1. Define a Port interface in the application layer describing only what the core needs.
2. Implement an Adapter/Client in the infrastructure layer that wraps the vendor SDK.
3. Inject the port into the domain/application code.

## Mitigation hint

> Wrap the external dependency behind a Port interface in application/port/out/ and create an Adapter implementation in infrastructure/adapter/

## Tags

`adapter` `hexagonal` `port` `clean-architecture`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
