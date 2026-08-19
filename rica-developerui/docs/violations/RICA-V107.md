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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Entities are the innermost domain layer; they must not know about services, repositories, or infrastructure. Such references are not persisted, break serialization, and tangle the domain with upper layers so entities can no longer be reused across data sources or tested without bootstrapping the whole application.

## How to fix

1. Remove service/repository/infrastructure fields and calls from the entity.
2. Have the service layer coordinate domain objects and perform data access.
3. If the entity needs derived data, compute it in the service and pass it in.

## Mitigation hint

> Access external layers through the Service layer instead of directly

## Tags

`layering` `entity` `dependency-rule`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
