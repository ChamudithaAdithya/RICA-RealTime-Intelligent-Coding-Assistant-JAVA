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

### Before (violates)

```
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable long id) { // User is @Entity
        return userService.findById(id);
    }
}
```


### After (fixed)

```
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public UserResponse getUser(@PathVariable long id) {
        return userService.getUserResponse(id); // mapped to DTO
    }
}
```


## Why it matters

Returning persistence entities in responses leaks your internal schema and storage model to external consumers. Any schema change becomes a breaking API change. DTOs decouple the API contract from the data model so internal refactors never break clients.

## How to fix

1. Create a response DTO with just the fields the client needs.
2. Map the entity to the DTO in the service layer.
3. Return the DTO from the endpoint.

## Mitigation hint

> Replace the Entity return type with a DTO to avoid leaking persistence details

## Tags

`dto` `entity` `api`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
