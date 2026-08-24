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

### Violating example

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


### Fixed version

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


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Service
  public class OrderService {
+     private final ConnectionProxy connectionProxy;
+     public OrderService(ConnectionProxy connectionProxy) {
+         this.connectionProxy = connectionProxy;
+     }
      public void process() {
-         DataSource ds = new DataSource("jdbc:mysql://...");
-         Connection conn = ds.getConnection();
-         conn.execute("SELECT ...");
+         connectionProxy.execute("SELECT ...");
      }
  }
```


## Why it matters

Heavy resources require lifecycle, access-control, and caching concerns (lazy loading, pooling, security checks) that a Proxy centralizes. Direct creation scatters construction cost, leaks connection handling into business logic, and makes testing and resource pooling impossible. A Proxy or injected bean keeps the business layer decoupled from resource acquisition.

## Common framework cases

### Heavy resource created directly

**When you see this:** Business code constructs or opens `DataSource`, `Connection`, `Socket`, `HttpClient`, `EntityManager`, or similar resources.

**Do this:**

1. Move resource creation to infrastructure/configuration.
2. Expose a small proxy/gateway interface to the application layer.
3. Inject that interface and let infrastructure manage pooling, timeouts, transactions, and cleanup.

**Avoid:** Do not manually open/close heavyweight resources inside business methods.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Create a Proxy or wrapper interface in the application layer (e.g., ConnectionProvider, ResourceProxy).**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Implement it in infrastructure with pooling/lazy/access-control logic.**
   This keeps the code aligned with the service / application (non-infrastructure) responsibility expected by RICA-V322.
3. **Inject the proxy interface into business methods instead of calling `new` or `getConnection()` directly.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V322 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Access heavy resources through a Proxy or managed wrapper/bean (lazy loading, access control, caching) instead of direct instantiation in business logic

## Tags

`proxy` `resource` `heavy-resource` `structural`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
