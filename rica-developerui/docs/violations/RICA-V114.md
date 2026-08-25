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

### Violating example

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


### Fixed version

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


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class OrderController {
+     private final OrderRepository orderRepository;
+
      @GetMapping("/orders/recent")
      public List<Order> recent() {
-         JdbcTemplate jt = new JdbcTemplate(dataSource);
-         return jt.query("SELECT * FROM orders", rowMapper);
+         return orderRepository.findRecent();
      }
  }
```


## Why it matters

Controllers must never touch persistence directly. Database access bypasses the transactional/service layers, scatters SQL across the HTTP boundary, and makes query behavior untestable without the controller. All data access belongs in repositories.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Repository pattern](../concepts/repository-pattern.md) - Learn what belongs in repositories and why query annotations belong at the persistence boundary.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Separation of concerns](../concepts/separation-of-concerns.md) - Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.
- [Infrastructure](../concepts/infrastructure.md) - Learn what infrastructure means in RICA: databases, HTTP clients, message brokers, files, SDKs, and framework adapters.

## Common framework cases

### Raw SQL or JDBC appears outside repository/infrastructure

**When you see this:** RICA sees SQL strings, `JdbcTemplate`, `Connection`, `PreparedStatement`, or `EntityManager` access in controller/service/domain code.

**Do this:**

1. Move the query into a repository method.
2. Use Spring Data derived queries or `@Query` in the repository interface when appropriate.
3. Let the service call a named repository method that describes the business intent.

**Avoid:** Do not paste SQL into a service to avoid creating a repository method.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move the query/update into a repository method.**
   This keeps persistence behind the correct boundary, so domain and presentation code do not depend on storage details.
2. **Have a service call the repository.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **Inject the service into the controller.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V114 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Move all database access to repository or service layer classes

## Tags

`jdbc` `sql` `repository` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
