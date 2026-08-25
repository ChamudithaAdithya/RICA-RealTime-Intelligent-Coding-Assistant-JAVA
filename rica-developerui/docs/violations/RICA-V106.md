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

### Violating example

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


### Fixed version

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


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class OrderController {
+     private final OrderService orderService;
+
      @PostMapping("/orders/apply")
-     public double apply(@RequestBody Order order) {
-         double total = 0;
-         for (Item i : order.getItems()) {
-             if (i.isDiscounted()) { total += i.getPrice() * 0.9; }
-             else { total += i.getPrice() * i.getQty(); }
-         }
-         if (total > 1000) total -= 50;
-         return total;
+     public double apply(@RequestBody OrderRequest req) {
+         return orderService.calculateTotal(req.toOrder());
      }
  }
```


## Why it matters

Controllers should only orchestrate HTTP concerns (parse input, call services, shape responses) and entities should only guard their own invariants. Complex decision-making and data manipulation in these layers makes the logic untestable without HTTP/persistence infrastructure and scatters business rules away from the service layer where they belong.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.
- [Infrastructure](../concepts/infrastructure.md) - Learn what infrastructure means in RICA: databases, HTTP clients, message brokers, files, SDKs, and framework adapters.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract the branches/loops/calculations into a service method.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Call that service from the controller/entity.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **Keep the controller and entity thin enough that their bodies are mostly delegation.**
   This keeps the code aligned with the controller / entity responsibility expected by RICA-V106.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V106 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Business logic should be in the Service layer, not in Controllers or Entities

## Tags

`business-logic` `controller` `entity`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
