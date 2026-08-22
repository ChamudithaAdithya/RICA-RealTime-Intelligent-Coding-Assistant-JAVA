# RICA-V322 — Missing Proxy

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingProxy` (DesignPatternAnalyzer) |
| Layer | service / application (non-infrastructure) |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V301`](./RICA-V301.md), [`RICA-V306`](./RICA-V306.md) |
| Source | `src/designPatternAnalyzer.ts:970` |

## Trigger

A non-infrastructure business method directly instantiates or accesses a heavy resource type (EntityManager, DataSource, Connection, Socket, HttpClient, RestTemplate, etc.) via `new` or sensitive factory calls (`getConnection`, `open`, `connect`) without a Proxy/managed wrapper or interface indirection in the infrastructure layer.

### Before (violates)

```
@Service
public class OrderService {
    public void process() {
        DataSource ds = new DataSource("jdbc:mysql://...");
        Connection conn = ds.getConnection();
        conn.execute("SELECT ...");
    }
}
```


### After (fixed)

```
@Service
public class OrderService {
    private final ConnectionProxy connectionProxy;
    public OrderService(ConnectionProxy connectionProxy) {
        this.connectionProxy = connectionProxy;
    }
    public void process() {
        connectionProxy.execute("SELECT ...");
    }
}
```


## Why it matters

Heavy resources require lifecycle, access-control, and caching concerns (lazy loading, pooling, security checks) that a Proxy centralizes. Direct creation scatters construction cost, leaks connection handling into business logic, and makes testing and resource pooling impossible. A Proxy or injected bean keeps the business layer decoupled from resource acquisition.

## How to fix

1. Create a Proxy or wrapper interface in the application layer (e.g., ConnectionProvider, ResourceProxy).
2. Implement it in infrastructure with pooling/lazy/access-control logic.
3. Inject the proxy interface into business methods instead of calling `new` or `getConnection()` directly.

## Mitigation hint

> Access heavy resources through a Proxy or managed wrapper/bean (lazy loading, access control, caching) instead of direct instantiation in business logic

## Tags

`proxy` `resource` `heavy-resource` `structural`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
