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

### Violating example

```
// 8+ dependents, 600 lines, 70% pass-through methods
public class MegaService {
    public void a() { repoA.find(); }
    public void b() { repoB.find(); }
    public void c() { repoC.find(); }
    // ... dozens more 1-line delegations
}
```


### Fixed version

```
@Service
public class ProductService { ... }
@Service
public class InventoryService { ... }
@Service
public class PricingService { ... }
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- // 8+ dependents, 600 lines, 70% pass-through methods
- public class MegaService {
-     public void a() { repoA.find(); }
-     public void b() { repoB.find(); }
-     public void c() { repoC.find(); }
-     // ... dozens more 1-line delegations
- }
+ @Service
+ public class ProductService { ... }
+ @Service
+ public class InventoryService { ... }
+ @Service
+ public class PricingService { ... }
```


## Why it matters

God facades concentrate too much responsibility: many dependents, too much code, and huge surface area. Any change is risky and testing is slow because one class coordinates everything. Responsibilities should be split into focused services.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.
- [Structural patterns](../concepts/structural-patterns.md) - Learn Adapter, Facade, Proxy, Decorator, and Composite as ways to shape dependencies between objects.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Group the delegated responsibilities into distinct services.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Split the facade by cohesive behavior, not by convenience.**
   This keeps the code aligned with the service / facade responsibility expected by RICA-V302.
3. **Keep dependents pointing at the small focused services instead of the monolith.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V302 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Decompose this facade — extract domain logic into domain objects and keep only orchestration here

## Tags

`facade` `god-object` `decomposition`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
