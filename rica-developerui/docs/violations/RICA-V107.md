# RICA-V107 — Direct Layer Access

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `EntityLayerAnalyzer` (EntityLayer) |
| Layer | entity |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V401`](./RICA-V401.md), [`RICA-V402`](./RICA-V402.md) |
| Source | `src/entityLayerDetector.ts:85` |

## Trigger

An Entity holds a field, calls a method, or instantiates a service, repository, or infrastructure class directly.

### Violating example

```
@Entity
public class User {
    @Autowired private AuditService auditService; // wrong layer

    public void disable() {
        auditService.log("disabled"); // entity reaches up
        this.enabled = false;
    }
}
```


### Fixed version

```
@Entity
public class User {
    private boolean enabled = true;

    public void disable() { this.enabled = false; }
}

// Service layer owns the audit call
@Transactional
public void disableUser(long id) {
    User user = userRepository.findById(id);
    user.disable();
    auditService.log("disabled " + id);
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Entity
  public class User {
-     @Autowired private AuditService auditService; // wrong layer
+     private boolean enabled = true;

-     public void disable() {
-         auditService.log("disabled"); // entity reaches up
-         this.enabled = false;
-     }
+     public void disable() { this.enabled = false; }
  }
+
+ // Service layer owns the audit call
+ @Transactional
+ public void disableUser(long id) {
+     User user = userRepository.findById(id);
+     user.disable();
+     auditService.log("disabled " + id);
+ }
```


## Why it matters

Entities are the innermost domain layer; they must not know about services, repositories, or infrastructure. Such references are not persisted, break serialization, and tangle the domain with upper layers so entities can no longer be reused across data sources or tested without bootstrapping the whole application.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Remove service/repository/infrastructure fields and calls from the entity.**
   This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.
2. **Have the service layer coordinate domain objects and perform data access.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **If the entity needs derived data, compute it in the service and pass it in.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V107 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Access external layers through the Service layer instead of directly

## Tags

`layering` `entity` `dependency-rule`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
