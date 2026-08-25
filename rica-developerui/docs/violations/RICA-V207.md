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

### Violating example

```
@GetMapping("/invoices/{id}")
public Invoice getInvoice(@PathVariable long id) { // Invoice is an internal model
    return invoiceService.findById(id);
}
```


### Fixed version

```
@GetMapping("/invoices/{id}")
public InvoiceResponse getInvoice(@PathVariable long id) {
    return invoiceService.getInvoiceResponse(id);
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @GetMapping("/invoices/{id}")
- public Invoice getInvoice(@PathVariable long id) { // Invoice is an internal model
-     return invoiceService.findById(id);
+ public InvoiceResponse getInvoice(@PathVariable long id) {
+     return invoiceService.getInvoiceResponse(id);
  }
```


## Why it matters

Returning internal domain objects (beyond entities) still leaks the internal model into the API contract. A DTO keeps the contract stable even when domain internals change and gives you a place to shape exactly what the client sees.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.
- [API boundary design](../concepts/api-boundary-design.md) - Learn request/response contracts, versioning, sensitive data leaks, and client-facing stability.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.
- [Validation and error boundaries](../concepts/validation-and-error-boundaries.md) - Learn where validation, exception mapping, and HTTP error shape should live.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Create a response DTO.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
2. **Map the domain object to the DTO in the service layer.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
3. **Return the DTO from the endpoint.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V207 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Refactor the API to return DTOs instead of internal domain objects

## Tags

`dto` `api` `internal-structure`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
