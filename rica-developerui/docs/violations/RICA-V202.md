# RICA-V202 — Missing DTO Usage

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V201`](./RICA-V201.md), [`RICA-V206`](./RICA-V206.md), [`RICA-V207`](./RICA-V207.md) |
| Source | `src/apiResourceLayerDetector.ts:217` |

## Trigger

An endpoint parameter is an internal domain/entity class instead of a DTO. Private helper methods are skipped.

### Before (violates)

```
@PostMapping("/orders")
public Order create(@RequestBody Order order) { // internal/entity type
    return orderService.save(order);
}
```


### After (fixed)

```
@PostMapping("/orders")
public OrderResponse create(@RequestBody @Valid OrderRequest req) {
    return orderService.create(req);
}
```


## Why it matters

Accepting domain objects directly as request payloads couples your API contract to the internal model and skips the boundary where validation/transformation should happen. Request DTOs let you validate input (see V206) and map only what is needed into the domain.

## How to fix

1. Create a request DTO containing the input fields and validation annotations.
2. Change the endpoint parameter to the DTO.
3. Map the DTO to the domain object in the service layer.

## Mitigation hint

> Create and use a DTO class instead of exposing internal types in the API

## Tags

`dto` `api` `validation`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
