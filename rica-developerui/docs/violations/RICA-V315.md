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

## How to fix

1. Hoist invariant value construction outside the loop.
2. Cache frequently reused immutable values.
3. Prefer shared constants for stable configuration-like values.

## Mitigation hint

> Reuse immutable value objects (Flyweight/cache) instead of allocating them inside loops or stream pipelines

## Tags

`flyweight` `memory` `allocation`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
