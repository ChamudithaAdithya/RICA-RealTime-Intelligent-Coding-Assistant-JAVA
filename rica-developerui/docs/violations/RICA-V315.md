# RICA-V315 - Flyweight Missing

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 - Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkRedundantMemory` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V305`](./RICA-V305.md) |
| Source | `src/designPatternAnalyzer.ts:825` |

## Trigger

A loop repeatedly allocates immutable value-like objects such as Money, Currency, Price, Amount, Rate, or Config.

## Why it matters

Repeated value-object allocation inside hot loops creates unnecessary memory pressure. Reusing immutable values or caching shared instances reduces allocation churn without changing behavior.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Concurrency and resource boundaries](../concepts/concurrency-boundaries.md) - Understand why threads, executors, sockets, connections, and heavyweight resources need ownership boundaries.
- [Domain model vs anemic model](../concepts/domain-model-vs-anemic-model.md) - Learn where domain invariants belong and when entities become too passive or too busy.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `any`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Design-pattern rules are heuristic. They detect strong design smells, not absolute proof. Prefer a small refactor only when the pattern removes real duplication, coupling, or lifecycle risk.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Hoist invariant value construction outside the loop.**
   This keeps the code aligned with the any responsibility expected by RICA-V315.
2. **Cache frequently reused immutable values.**
   This keeps the code aligned with the any responsibility expected by RICA-V315.
3. **Prefer shared constants for stable configuration-like values.**
   This keeps the code aligned with the any responsibility expected by RICA-V315.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V315 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Reuse immutable value objects (Flyweight/cache) instead of allocating them inside loops or stream pipelines

## Tags

`flyweight` `memory` `allocation`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
