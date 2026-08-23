# RICA-V311 — Missing Prototype

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingPrototype` (DesignPatternAnalyzer) |
| Layer | service / mapper |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V312`](./RICA-V312.md) |
| Source | `src/designPatternAnalyzer.ts:691` |

## Trigger

A method manually copies several matching fields with getter-to-setter pairs instead of using a clone, copy constructor, or mapper abstraction.

## Why it matters

Manual field copying is brittle. New fields are easy to forget, copy semantics are duplicated, and deep-copy behavior becomes inconsistent across the codebase.

## How to fix

1. Use a copy constructor, clone method, or explicit copy factory.
2. For DTO mapping, use a dedicated mapper and keep it exempt from prototype findings.
3. Keep deep-copy behavior in one reviewed implementation.

## Mitigation hint

> Copy objects via clone()/copy constructors (Prototype) instead of manual field-by-field getter-to-setter copying

## Tags

`prototype` `copy` `mapping`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
