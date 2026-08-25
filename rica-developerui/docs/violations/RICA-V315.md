# RICA-V315 — Flyweight Missing

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

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
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.

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
