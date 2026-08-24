# RICA-V204 — Business Logic in Resource

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

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
