# RICA-V202 - Missing DTO Usage

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 - Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V201`](./RICA-V201.md), [`RICA-V206`](./RICA-V206.md), [`RICA-V207`](./RICA-V207.md) |
| Source | `src/apiResourceLayerDetector.ts:217` |

## Trigger

An endpoint parameter is an internal domain/entity class instead of a DTO. Private helper methods are skipped.

### Violating example

```
@PostMapping("/orders")
public Order create(@RequestBody Order order) { // internal/entity type
    return orderService.save(order);
}
```


### Fixed version

```
@PostMapping("/orders")
public OrderResponse create(@RequestBody @Valid OrderRequest req) {
    return orderService.create(req);
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @PostMapping("/orders")
- public Order create(@RequestBody Order order) { // internal/entity type
-     return orderService.save(order);
+ public OrderResponse create(@RequestBody @Valid OrderRequest req) {
+     return orderService.create(req);
  }
```


## Why it matters

Accepting domain objects directly as request payloads couples your API contract to the internal model and skips the boundary where validation/transformation should happen. Request DTOs let you validate input (see V206) and map only what is needed into the domain.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.
- [API boundary design](../concepts/api-boundary-design.md) - Learn request/response contracts, versioning, sensitive data leaks, and client-facing stability.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Separation of concerns](../concepts/separation-of-concerns.md) - Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.
- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.
- [Framework coupling](../concepts/framework-coupling.md) - Learn when Spring, JPA, servlet, HTTP-client, and SDK imports leak framework concerns into the wrong layer.

## Common framework cases

### Endpoint accepts an Entity as request body

**When you see this:** A controller/resource parameter uses a domain/entity type for incoming JSON.

**Do this:**

1. Create a request DTO for the endpoint input.
2. Validate the DTO at the boundary.
3. Map the DTO into domain commands/entities inside the service layer.

**Avoid:** Do not expose entity setters and persistence fields to clients through request JSON.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Create a request DTO containing the input fields and validation annotations.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
2. **Change the endpoint parameter to the DTO.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
3. **Map the DTO to the domain object in the service layer.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V202 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Create and use a DTO class instead of exposing internal types in the API

## Tags

`dto` `api` `validation`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
