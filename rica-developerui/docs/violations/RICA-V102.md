# RICA-V102 — Uninjected Repository Access

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ServiceLayerAnalyzer` (ServiceLayer) |
| Layer | service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V101`](./RICA-V101.md), [`RICA-V103`](./RICA-V103.md) |
| Source | `src/serviceLayerDetector.ts:44` |

## Trigger

A Service declares a repository-type field (Repository/DAO) without an injection annotation, or a Service method calls a repository through a reference that was not injected.

### Violating example

```
@Service
public class OrderService {
    private JdbcOrderRepository orderRepository; // no @Autowired

    public void charge() {
        orderRepository.deduct(); // NPE at runtime
    }
}
```


### Fixed version

```
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public void charge() {
        orderRepository.deduct();
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Service
  public class OrderService {
-     private JdbcOrderRepository orderRepository; // no @Autowired
+     private final OrderRepository orderRepository;

+     public OrderService(OrderRepository orderRepository) {
+         this.orderRepository = orderRepository;
+     }
+
      public void charge() {
-         orderRepository.deduct(); // NPE at runtime
+         orderRepository.deduct();
      }
  }
```


## Why it matters

A repository field with no injection annotation is either a null pointer waiting to happen or a manual wire-up that hides the dependency. Without the container supplying the repository, the service is bound to a specific construction path and cannot be given a mock or alternative implementation in tests.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Repository pattern](../concepts/repository-pattern.md) - Learn what belongs in repositories and why query annotations belong at the persistence boundary.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.

## Common framework cases

### Repository field exists but has no injection path

**When you see this:** A service has `private OrderRepository orderRepository;` with no constructor assignment and no DI annotation.

**Do this:**

1. Prefer constructor injection: make the repository `private final` and add it as a constructor parameter.
2. If the project uses field injection, add `@Autowired` to the field and import the annotation.
3. Remove manual `new Repository(...)` construction if it exists.

**Avoid:** Do not silence this by making the repository static or creating it inside each method.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Annotate a repository field with `@Autowired`, `@Inject`, or `@Resource`.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
2. **Or inject it through the constructor.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
3. **Prefer constructor injection for immutable, explicit dependencies.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V102 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Annotate the field with @Autowired or use constructor injection

## Tags

`di` `repository` `service`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
