# RICA-V103 — Uninjected Service Access

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer` (ControllerLayer) |
| Layer | controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V101`](./RICA-V101.md), [`RICA-V102`](./RICA-V102.md) |
| Source | `src/controllerLayerDetector.ts:116` |

## Trigger

A Controller has a service or repository field without an injection annotation, or a Controller method calls a service/repository (and some infrastructure clients) through an uninjected reference.

### Before (violates)

```
@RestController
public class OrderController {
    private OrderService orderService; // not injected

    @PostMapping("/orders")
    public void create(@RequestBody OrderRequest req) {
        orderService.create(req);
    }
}
```


### After (fixed)

```
@RestController
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/orders")
    public void create(@RequestBody OrderRequest req) {
        orderService.create(req);
    }
}
```


## Why it matters

Controllers are thin HTTP adapters. When they reach for services through uninjected fields or method-local references, they lose the benefits of the container — testability, lifecycle management, and the ability to swap in fakes. The wiring belongs to the container; the controller should only orchestrate HTTP concerns.

## How to fix

1. Add `@Autowired`/`@Inject` to the service or repository field, or use constructor injection.
2. Call services only through injected fields/parameters.

## Mitigation hint

> Annotate the field with @Autowired or use constructor injection

## Tags

`di` `controller` `service`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
