# RICA-V204 - Business Logic in Resource

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 - Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | `enableBusinessLogicChecks` |
| Related rules | [`RICA-V106`](./RICA-V106.md) |
| Source | `src/apiResourceLayerDetector.ts:176` |

## Trigger

An API resource method has a business-logic score at or above the configured threshold (default 3), i.e. loops, conditionals, and data manipulation inline in the REST handler.

### Violating example

```
@PostMapping("/discount")
public double discount(@RequestBody ItemRequest req) {
    double price = req.getPrice();
    if (req.getType().equals("VIP")) price *= 0.8;
    else if (req.getType().equals("STAFF")) price *= 0.9;
    return price;
}
```


### Fixed version

```
@PostMapping("/discount")
public double discount(@RequestBody ItemRequest req) {
    return priceService.applyDiscount(req.toItem());
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @PostMapping("/discount")
  public double discount(@RequestBody ItemRequest req) {
-     double price = req.getPrice();
-     if (req.getType().equals("VIP")) price *= 0.8;
-     else if (req.getType().equals("STAFF")) price *= 0.9;
-     return price;
+     return priceService.applyDiscount(req.toItem());
  }
```


## Why it matters

REST resources should be thin: parse, delegate, respond. Inline business logic makes the handler impossible to test without HTTP infrastructure and moves rules away from the service layer, where they belong for reuse and unit testing.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Separation of concerns](../concepts/separation-of-concerns.md) - Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.
- [Service Layer pattern](../concepts/service-layer-pattern.md) - Learn why business use cases should be orchestrated in services rather than controllers or repositories.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.
- [API boundary design](../concepts/api-boundary-design.md) - Learn request/response contracts, versioning, sensitive data leaks, and client-facing stability.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `api`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Business-logic findings use thresholds. Small validation or trivial branching may be acceptable; repeated calculations, workflows, and policy decisions should move to services or domain code.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move branches/calculations to a service method.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Delegate from the resource method to the service.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V204 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Move business logic from the API resource to the Service layer

## Tags

`business-logic` `api` `thin-controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
