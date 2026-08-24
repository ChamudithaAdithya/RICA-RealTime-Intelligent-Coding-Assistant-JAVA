# RICA-V104 — Anemic Service

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ServiceLayerAnalyzer` (ServiceLayer) |
| Layer | service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V106`](./RICA-V106.md), [`RICA-V108`](./RICA-V108.md) |
| Source | `src/serviceLayerDetector.ts:141` |

## Trigger

A `@Service` class has zero concrete methods, or has at least two concrete methods where every one of them is only an accessor or a trivial pass-through delegation with no business logic, no branching, and no meaningful body.

### Violating example

```
@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) { this.repo = repo; }

    public List<Order> findAll() { return repo.findAll(); }
    public Order findById(long id) { return repo.findById(id); }
}
```


### Fixed version

```
@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) { this.repo = repo; }

    public List<Order> findAll() { return repo.findAll(); }

    public void place(Order order) {
        order.assertValid();
        if (!order.isBelowLimit()) {
            throw new OrderLimitException("over limit");
        }
        repo.save(order);
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Service
  public class OrderService {
      private final OrderRepository repo;

      public OrderService(OrderRepository repo) { this.repo = repo; }

      public List<Order> findAll() { return repo.findAll(); }
-     public Order findById(long id) { return repo.findById(id); }
+
+     public void place(Order order) {
+         order.assertValid();
+         if (!order.isBelowLimit()) {
+             throw new OrderLimitException("over limit");
+         }
+         repo.save(order);
+     }
  }
```


## Why it matters

Services are the natural home for business rules: validation, calculations, orchestration, and state transitions. When a service is nothing but getters and delegation, that logic has leaked into controllers, entities, or helpers — making it untestable in isolation and harder to reason about. RICA flags it so behavior can be pulled back into the layer that owns it.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move validation, calculation, and orchestration logic from controllers/entities into the service.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Give the service at least one method that embodies a business rule (beyond a single call-through).**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **If the class genuinely has no behavior, reconsider whether it should be a service at all.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V104 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Move business logic from controllers/entities into this service class

## Tags

`anemic` `service` `business-logic`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
