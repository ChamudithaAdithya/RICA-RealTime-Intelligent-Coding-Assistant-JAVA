# RICA-V201 — Exposing Internal Entity

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V202`](./RICA-V202.md), [`RICA-V207`](./RICA-V207.md), [`RICA-V404`](./RICA-V404.md) |
| Source | `src/apiResourceLayerDetector.ts:196` |

## Trigger

A public API endpoint method returns an `@Entity` type (or a collection of entities) directly. Private helper methods are skipped.

### Violating example

```
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable long id) { // User is @Entity
        return userService.findById(id);
    }
}
```


### Fixed version

```
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public UserResponse getUser(@PathVariable long id) {
        return userService.getUserResponse(id); // mapped to DTO
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class UserController {
      @GetMapping("/users/{id}")
-     public User getUser(@PathVariable long id) { // User is @Entity
-         return userService.findById(id);
+     public UserResponse getUser(@PathVariable long id) {
+         return userService.getUserResponse(id); // mapped to DTO
      }
  }
```


## Why it matters

Returning persistence entities in responses leaks your internal schema and storage model to external consumers. Any schema change becomes a breaking API change. DTOs decouple the API contract from the data model so internal refactors never break clients.

## Common framework cases

### Endpoint returns an Entity directly

**When you see this:** A controller/resource method returns `User`, `Order`, `List<Order>`, `ResponseEntity<Order>`, or another persistence/domain object.

**Do this:**

1. Create a response DTO with only fields the API is allowed to expose.
2. Map the entity to the DTO before returning.
3. Keep entity relationships, lazy fields, and persistence annotations out of the response contract.

**Avoid:** Do not annotate the entity with JSON ignore annotations as the primary architecture fix. That hides symptoms but keeps the API coupled to persistence.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Create a response DTO with just the fields the client needs.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
2. **Map the entity to the DTO in the service layer.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
3. **Return the DTO from the endpoint.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V201 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Replace the Entity return type with a DTO to avoid leaking persistence details

## Tags

`dto` `entity` `api`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
