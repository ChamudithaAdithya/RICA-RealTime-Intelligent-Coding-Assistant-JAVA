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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Entities must not manage persistence. Embedding JDBC/JPA access in an entity couples the domain object to a specific storage technology, breaks portability across data sources, and mixes persistence concerns into the domain. Data access belongs in repositories.

## How to fix

1. Remove database fields and APIs from the entity.
2. Create (or use) a repository that owns all data access.
3. Have the service coordinate repository calls and entity changes.

## Mitigation hint

> Entities should not contain data access logic — move to Repository

## Tags

`jdbc` `jpa` `entity` `repository`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
