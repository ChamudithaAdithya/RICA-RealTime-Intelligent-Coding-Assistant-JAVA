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

### Violating example

```
@GetMapping("/orders/{id}")
public OrderResponse get(@RequestParam String id) {
    return orderService.findById(Long.parseLong(id));
}
```


### Fixed version

```
@GetMapping("/orders/{id}")
public OrderResponse get(@RequestParam @Positive long id) {
    return orderService.findById(id);
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @GetMapping("/orders/{id}")
- public OrderResponse get(@RequestParam String id) {
-     return orderService.findById(Long.parseLong(id));
+ public OrderResponse get(@RequestParam @Positive long id) {
+     return orderService.findById(id);
  }
```


## Why it matters

Unvalidated input produces cryptic failures deep in the stack instead of clean 400 responses. Validation annotations document the contract and fail fast at the boundary.

## Common framework cases

### Request body has no validation

**When you see this:** A POST/PUT/PATCH endpoint accepts a request DTO without `@Valid`/`@Validated` or field constraints.

**Do this:**

1. Add `@Valid` to `@RequestBody` DTO parameters.
2. Add constraints such as `@NotNull`, `@NotBlank`, `@Size`, `@Min`, or `@Email` inside the DTO.
3. Keep primitive path/query parameters constrained only when the domain really requires it.

**Avoid:** Do not only add `@Valid` if the DTO has no field constraints. That validates nothing useful.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Annotate the parameter or its type with `@Valid` plus constraints like `@NotNull`, `@Size`, `@Email`, `@Min`.**
   This rejects bad input at the boundary before it reaches business logic or persistence code.
2. **Enable `@Validated` on the controller for simple/`@RequestParam` values.**
   This rejects bad input at the boundary before it reaches business logic or persistence code.
3. **Return a uniform validation-error payload via `@ExceptionHandler` (MethodArgumentNotValidException).**
   This keeps the code aligned with the api responsibility expected by RICA-V206.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V206 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Add validation annotations (@Valid, @NotNull, etc.) to API method parameters

## Tags

`validation` `api` `input`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
