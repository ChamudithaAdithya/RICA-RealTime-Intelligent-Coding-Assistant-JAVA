# RICA-V321 — Excessive Null Checks

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkExcessiveNullChecks` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V319`](./RICA-V319.md) |
| Source | `src/designPatternAnalyzer.ts:1044` |

## Trigger

A method performs at least the configured number of null checks across multiple distinct target roots.

## Why it matters

Scattered null checks usually mean upstream contracts are unclear. Null Objects, Optional return types, and empty collections make absence explicit and reduce defensive boilerplate.

## How to fix

1. Return empty collections instead of null collections.
2. Use Optional at boundaries where absence is expected.
3. Introduce Null Object defaults for common nullable collaborators.

## Mitigation hint

> Replace repetitive null checks with Optional, Null Objects, or empty collections at the source

## Tags

`null-object` `optional` `defensive-code`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
