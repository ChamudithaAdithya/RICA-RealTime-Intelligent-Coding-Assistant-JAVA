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

### Before (violates)

```
@Service
public class OrderService {
    private JdbcOrderRepository orderRepository; // no @Autowired

    public void charge() {
        orderRepository.deduct(); // NPE at runtime
    }
}
```


### After (fixed)

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


## Why it matters

A repository field with no injection annotation is either a null pointer waiting to happen or a manual wire-up that hides the dependency. Without the container supplying the repository, the service is bound to a specific construction path and cannot be given a mock or alternative implementation in tests.

## How to fix

1. Annotate a repository field with `@Autowired`, `@Inject`, or `@Resource`.
2. Or inject it through the constructor.
3. Prefer constructor injection for immutable, explicit dependencies.

## Mitigation hint

> Annotate the field with @Autowired or use constructor injection

## Tags

`di` `repository` `service`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
