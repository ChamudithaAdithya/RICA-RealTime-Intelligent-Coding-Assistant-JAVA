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

### Before (violates)

```
@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) { this.repo = repo; }

    public List<Order> findAll() { return repo.findAll(); }
    public Order findById(long id) { return repo.findById(id); }
}
```


### After (fixed)

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


## Why it matters

Services are the natural home for business rules: validation, calculations, orchestration, and state transitions. When a service is nothing but getters and delegation, that logic has leaked into controllers, entities, or helpers — making it untestable in isolation and harder to reason about. RICA flags it so behavior can be pulled back into the layer that owns it.

## How to fix

1. Move validation, calculation, and orchestration logic from controllers/entities into the service.
2. Give the service at least one method that embodies a business rule (beyond a single call-through).
3. If the class genuinely has no behavior, reconsider whether it should be a service at all.

## Mitigation hint

> Move business logic from controllers/entities into this service class

## Tags

`anemic` `service` `business-logic`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
