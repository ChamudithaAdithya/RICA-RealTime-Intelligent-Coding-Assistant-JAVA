# RICA-V109 - Improper Data Access

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 - Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `EntityLayerAnalyzer` (EntityLayer) |
| Layer | entity |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V114`](./RICA-V114.md), [`RICA-V401`](./RICA-V401.md) |
| Source | `src/entityLayerDetector.ts:101` |

## Trigger

An Entity holds a field of a database type (JdbcTemplate, EntityManager, DataSource, JDBC types, Hibernate/ORM types), calls a database API, or constructs a database access object.

### Violating example

```
@Entity
public class AuditLog {
    @Autowired private JdbcTemplate jdbcTemplate;

    public List<String> recent(int limit) {
        return jdbcTemplate.queryForList(
            "SELECT message FROM audit_log ORDER BY id DESC LIMIT ?", String.class, limit);
    }
}
```


### Fixed version

```
@Entity
public class AuditLogEntry {
    private Long id;
    private String message;
}

@Repository
public class AuditLogRepository {
    private final JdbcTemplate jdbcTemplate;

    public List<String> recent(int limit) { /* data access here */ }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Entity
- public class AuditLog {
-     @Autowired private JdbcTemplate jdbcTemplate;
+ public class AuditLogEntry {
+     private Long id;
+     private String message;
+ }

-     public List<String> recent(int limit) {
-         return jdbcTemplate.queryForList(
-             "SELECT message FROM audit_log ORDER BY id DESC LIMIT ?", String.class, limit);
-     }
+ @Repository
+ public class AuditLogRepository {
+     private final JdbcTemplate jdbcTemplate;
+
+     public List<String> recent(int limit) { /* data access here */ }
  }
```


## Why it matters

Entities must not manage persistence. Embedding JDBC/JPA access in an entity couples the domain object to a specific storage technology, breaks portability across data sources, and mixes persistence concerns into the domain. Data access belongs in repositories.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Repository pattern](../concepts/repository-pattern.md) - Learn what belongs in repositories and why query annotations belong at the persistence boundary.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Remove database fields and APIs from the entity.**
   This moves storage-specific work to the persistence boundary, so controllers, services, and domain code no longer depend on database details.
2. **Create (or use) a repository that owns all data access.**
   This moves storage-specific work to the persistence boundary, so controllers, services, and domain code no longer depend on database details.
3. **Have the service coordinate repository calls and entity changes.**
   This moves storage-specific work to the persistence boundary, so controllers, services, and domain code no longer depend on database details.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V109 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Entities should not contain data access logic - move to Repository

## Tags

`jdbc` `jpa` `entity` `repository`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
