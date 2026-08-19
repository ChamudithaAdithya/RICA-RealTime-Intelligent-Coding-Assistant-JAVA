# RICA-V206 — Missing Validation

<Badge type="tip" text="Info" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V202`](./RICA-V202.md), [`RICA-V203`](./RICA-V203.md) |
| Source | `src/apiResourceLayerDetector.ts:259` |

## Trigger

An endpoint parameter lacks validation annotations (`@Valid`, `@NotNull`, `@Size`/`@Min`/`@Max`, `@Email`, etc.). Non-simple types without validation are flagged; simple types are only flagged when the parameter name contains `id`.

### Before (violates)

```
@GetMapping("/orders/{id}")
public OrderResponse get(@RequestParam String id) {
    return orderService.findById(Long.parseLong(id));
}
```


### After (fixed)

```
@GetMapping("/orders/{id}")
public OrderResponse get(@RequestParam @Positive long id) {
    return orderService.findById(id);
}
```


## Why it matters

Unvalidated input produces cryptic failures deep in the stack instead of clean 400 responses. Validation annotations document the contract and fail fast at the boundary.

## How to fix

1. Annotate the parameter or its type with `@Valid` plus constraints like `@NotNull`, `@Size`, `@Email`, `@Min`.
2. Enable `@Validated` on the controller for simple/`@RequestParam` values.
3. Return a uniform validation-error payload via `@ExceptionHandler` (MethodArgumentNotValidException).

## Mitigation hint

> Add validation annotations (@Valid, @NotNull, etc.) to API method parameters

## Tags

`validation` `api` `input`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
