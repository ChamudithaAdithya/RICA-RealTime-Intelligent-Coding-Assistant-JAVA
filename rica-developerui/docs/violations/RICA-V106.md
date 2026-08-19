# RICA-V106 — Business Logic in the Wrong Layer

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer / EntityLayerAnalyzer` (ControllerLayer) |
| Layer | controller / entity |
| Configuration | `enableBusinessLogicChecks` |
| Related rules | [`RICA-V104`](./RICA-V104.md), [`RICA-V204`](./RICA-V204.md) |
| Source | `src/controllerLayerDetector.ts:347` |

## Trigger

A Controller or Entity method has a business-logic score at or above the configured threshold (default 3). The score grows with the number of loops, conditionals, comparisons, and data-manipulation operators in the method body.

### Before (violates)

```
@RestController
public class OrderController {
    @PostMapping("/orders/apply")
    public double apply(@RequestBody Order order) {
        double total = 0;
        for (Item i : order.getItems()) {
            if (i.isDiscounted()) { total += i.getPrice() * 0.9; }
            else { total += i.getPrice() * i.getQty(); }
        }
        if (total > 1000) total -= 50;
        return total;
    }
}
```


### After (fixed)

```
@RestController
public class OrderController {
    private final OrderService orderService;

    @PostMapping("/orders/apply")
    public double apply(@RequestBody OrderRequest req) {
        return orderService.calculateTotal(req.toOrder());
    }
}
```


## Why it matters

Controllers should only orchestrate HTTP concerns (parse input, call services, shape responses) and entities should only guard their own invariants. Complex decision-making and data manipulation in these layers makes the logic untestable without HTTP/persistence infrastructure and scatters business rules away from the service layer where they belong.

## How to fix

1. Extract the branches/loops/calculations into a service method.
2. Call that service from the controller/entity.
3. Keep the controller and entity thin enough that their bodies are mostly delegation.

## Mitigation hint

> Business logic should be in the Service layer, not in Controllers or Entities

## Tags

`business-logic` `controller` `entity`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
