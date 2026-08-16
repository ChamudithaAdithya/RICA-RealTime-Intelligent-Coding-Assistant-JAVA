# RICA-V302 — God Facade

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkGodFacade` (DesignPatternAnalyzer) |
| Layer | service / facade |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V104`](./RICA-V104.md) |
| Source | `src/designPatternAnalyzer.ts:337` |

## Trigger

A class with 8+ incoming dependencies, 500+ lines, and at least 60% of its methods being trivial delegation.

### Before (violates)

```
// 8+ dependents, 600 lines, 70% pass-through methods
public class MegaService {
    public void a() { repoA.find(); }
    public void b() { repoB.find(); }
    public void c() { repoC.find(); }
    // ... dozens more 1-line delegations
}
```


### After (fixed)

```
@Service
public class ProductService { ... }
@Service
public class InventoryService { ... }
@Service
public class PricingService { ... }
```


## Why it matters

God facades concentrate too much responsibility: many dependents, too much code, and huge surface area. Any change is risky and testing is slow because one class coordinates everything. Responsibilities should be split into focused services.

## How to fix

1. Group the delegated responsibilities into distinct services.
2. Split the facade by cohesive behavior, not by convenience.
3. Keep dependents pointing at the small focused services instead of the monolith.

## Mitigation hint

> Decompose this facade — extract domain logic into domain objects and keep only orchestration here

## Tags

`facade` `god-object` `decomposition`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
