# RICA-V207 — Exposing Internal Structure

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V201`](./RICA-V201.md), [`RICA-V202`](./RICA-V202.md) |
| Source | `src/apiResourceLayerDetector.ts:238` |

## Trigger

An endpoint returns a non-DTO internal project class instead of a DTO. Entity returns are reported as V201 instead; private helper methods are skipped.

### Before (violates)

```
@GetMapping("/invoices/{id}")
public Invoice getInvoice(@PathVariable long id) { // Invoice is an internal model
    return invoiceService.findById(id);
}
```


### After (fixed)

```
@GetMapping("/invoices/{id}")
public InvoiceResponse getInvoice(@PathVariable long id) {
    return invoiceService.getInvoiceResponse(id);
}
```


## Why it matters

Returning internal domain objects (beyond entities) still leaks the internal model into the API contract. A DTO keeps the contract stable even when domain internals change and gives you a place to shape exactly what the client sees.

## How to fix

1. Create a response DTO.
2. Map the domain object to the DTO in the service layer.
3. Return the DTO from the endpoint.

## Mitigation hint

> Refactor the API to return DTOs instead of internal domain objects

## Tags

`dto` `api` `internal-structure`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
