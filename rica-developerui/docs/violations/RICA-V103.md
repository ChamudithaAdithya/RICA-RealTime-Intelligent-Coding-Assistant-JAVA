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

### Violating example

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


### Fixed version

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


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class OrderController {
-     private OrderService orderService; // not injected
+     private final OrderService orderService;

+     public OrderController(OrderService orderService) {
+         this.orderService = orderService;
+     }
+
      @PostMapping("/orders")
      public void create(@RequestBody OrderRequest req) {
          orderService.create(req);
      }
  }
```


## Why it matters

Controllers are thin HTTP adapters. When they reach for services through uninjected fields or method-local references, they lose the benefits of the container — testability, lifecycle management, and the ability to swap in fakes. The wiring belongs to the container; the controller should only orchestrate HTTP concerns.

## Common framework cases

### Controller calls a service that is not injected

**When you see this:** A controller has a service field, parameter, or receiver that RICA cannot prove was supplied by Spring/DI.

**Do this:**

1. Add the service as a constructor dependency on the controller.
2. Use the service interface or application-service class, not a concrete `ServiceImpl` when possible.
3. Keep request parsing in the controller and business workflow in the service.

**Avoid:** Do not instantiate the service in the controller with `new`.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Add `@Autowired`/`@Inject` to the service or repository field, or use constructor injection.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
2. **Call services only through injected fields/parameters.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V103 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Annotate the field with @Autowired or use constructor injection

## Tags

`di` `controller` `service`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
