# RICA-V109 — Improper Data Access

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

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

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Remove database fields and APIs from the entity.**
   This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.
2. **Create (or use) a repository that owns all data access.**
   This keeps persistence behind the correct boundary, so domain and presentation code do not depend on storage details.
3. **Have the service coordinate repository calls and entity changes.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V109 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Entities should not contain data access logic — move to Repository

## Tags

`jdbc` `jpa` `entity` `repository`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
