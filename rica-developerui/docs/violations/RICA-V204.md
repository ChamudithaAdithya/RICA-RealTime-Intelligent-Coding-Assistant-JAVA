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

### Before (violates)

```
@PostMapping("/discount")
public double discount(@RequestBody ItemRequest req) {
    double price = req.getPrice();
    if (req.getType().equals("VIP")) price *= 0.8;
    else if (req.getType().equals("STAFF")) price *= 0.9;
    return price;
}
```


### After (fixed)

```
@PostMapping("/discount")
public double discount(@RequestBody ItemRequest req) {
    return priceService.applyDiscount(req.toItem());
}
```


## Why it matters

REST resources should be thin: parse, delegate, respond. Inline business logic makes the handler impossible to test without HTTP infrastructure and moves rules away from the service layer, where they belong for reuse and unit testing.

## How to fix

1. Move branches/calculations to a service method.
2. Delegate from the resource method to the service.

## Mitigation hint

> Move business logic from the API resource to the Service layer

## Tags

`business-logic` `api` `thin-controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
