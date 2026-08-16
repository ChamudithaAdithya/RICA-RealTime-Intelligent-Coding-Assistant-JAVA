# RICA-V114 — Raw SQL Access

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer` (ControllerLayer) |
| Layer | controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V109`](./RICA-V109.md), [`RICA-V401`](./RICA-V401.md) |
| Source | `src/controllerLayerDetector.ts:232` |

## Trigger

A Controller method creates or calls a database access type (DataSource, JdbcTemplate, EntityManager, Connection, Statement, Session, SqlSession, etc.) directly.

### Before (violates)

```
@RestController
public class OrderController {
    @GetMapping("/orders/recent")
    public List<Order> recent() {
        JdbcTemplate jt = new JdbcTemplate(dataSource);
        return jt.query("SELECT * FROM orders", rowMapper);
    }
}
```


### After (fixed)

```
@RestController
public class OrderController {
    private final OrderRepository orderRepository;

    @GetMapping("/orders/recent")
    public List<Order> recent() {
        return orderRepository.findRecent();
    }
}
```


## Why it matters

Controllers must never touch persistence directly. Database access bypasses the transactional/service layers, scatters SQL across the HTTP boundary, and makes query behavior untestable without the controller. All data access belongs in repositories.

## How to fix

1. Move the query/update into a repository method.
2. Have a service call the repository.
3. Inject the service into the controller.

## Mitigation hint

> Move all database access to repository or service layer classes

## Tags

`jdbc` `sql` `repository` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
