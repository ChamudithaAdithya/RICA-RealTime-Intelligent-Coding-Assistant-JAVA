# RICA-V308 — Leaking Construction Logic

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkLeakingConstruction` (DesignPatternAnalyzer) |
| Layer | service / application |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V304`](./RICA-V304.md), [`RICA-V101`](./RICA-V101.md) |
| Source | `src/designPatternAnalyzer.ts:535` |

## Trigger

A business method performs complex object construction, nested constructor calls, or branching inside constructor arguments beyond the configured construction-statement limit.

## Why it matters

Construction-heavy business methods mix orchestration with object assembly. That makes the method harder to test and hides construction policy in unrelated logic. A Builder or Factory centralizes the assembly rules and leaves the business method focused on the use case.

## How to fix

1. Move complex construction into a Builder, Factory, or assembler.
2. Keep branching decisions out of constructor argument lists.
3. Inject the factory/builder when construction requires external policy.

## Mitigation hint

> Extract complex object initialization into a Builder or Factory so business methods stay focused on orchestration

## Tags

`builder` `factory` `construction`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
