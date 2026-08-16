# RICA-V404 — Entity Exposure

<Badge type="warning" text="Warning" />

> **Severity context**: <Badge type="warning" text="Warning" /> Entity returned from a public method or accepted as a parameter <Badge type="tip" text="Info" /> Entity exposed via a public/protected field

> **Stage**: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)

| | |
| --- | --- |
| Detector | `entityExposureRule (dependencyGraph.ts)` (CrossFileAnalyzer) |
| Layer | controller api |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V201`](./RICA-V201.md), [`RICA-V202`](./RICA-V202.md) |
| Source | `src/dependencyGraph.ts:644` |

## Trigger

A Controller exposes an entity layer type in a public method return type or parameter, or via a `public`/`protected` field.

### Before (violates)

```
@RestController
public class UserController {
    public User find(long id) {   // returns entity type
        return userService.findById(id);
    }
}
```


### After (fixed)

```
@RestController
public class UserController {
    public UserResponse find(long id) { // returns DTO
        return userService.getResponse(id);
    }
}
```


## Why it matters

Entities are internal persistence/domain shapes. Leaking them across the API boundary couples clients to the data model — schema changes become breaking changes. DTOs define a stable contract at the edge.

## How to fix

1. Replace the entity return type or parameter with a DTO.
2. Map between entity and DTO in the service layer.
3. Make entity fields on controllers private and delegate access via services.

## Mitigation hint

> Replace the Entity type with a dedicated DTO (Data Transfer Object) in the API contract

## Tags

`dto` `entity` `api` `graph`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
