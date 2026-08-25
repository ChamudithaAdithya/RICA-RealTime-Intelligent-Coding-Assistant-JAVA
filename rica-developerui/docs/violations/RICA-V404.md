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

### Violating example

```
@RestController
public class UserController {
    public User find(long id) {   // returns entity type
        return userService.findById(id);
    }
}
```


### Fixed version

```
@RestController
public class UserController {
    public UserResponse find(long id) { // returns DTO
        return userService.getResponse(id);
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class UserController {
-     public User find(long id) {   // returns entity type
-         return userService.findById(id);
+     public UserResponse find(long id) { // returns DTO
+         return userService.getResponse(id);
      }
  }
```


## Why it matters

Entities are internal persistence/domain shapes. Leaking them across the API boundary couples clients to the data model — schema changes become breaking changes. DTOs define a stable contract at the edge.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Dependency graphs and cycles](../concepts/dependency-graphs-and-cycles.md) - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.
- [Package boundaries](../concepts/package-boundaries.md) - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Replace the entity return type or parameter with a DTO.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
2. **Map between entity and DTO in the service layer.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
3. **Make entity fields on controllers private and delegate access via services.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V404 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Replace the Entity type with a dedicated DTO (Data Transfer Object) in the API contract

## Tags

`dto` `entity` `api` `graph`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
