# RICA-V312 — Fragmented Factories

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkFragmentedFactories` (DesignPatternAnalyzer) |
| Layer | factory |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V304`](./RICA-V304.md), [`RICA-V307`](./RICA-V307.md) |
| Source | `src/designPatternAnalyzer.ts:736` |

## Trigger

Multiple concrete `*Factory` classes create products but share no common factory abstraction.

## Why it matters

A set of unrelated concrete factories makes product-family creation inconsistent and hard to extend. An Abstract Factory gives callers one stable creation contract.

## How to fix

1. Introduce a common factory interface.
2. Group related product creation behind that interface.
3. Inject the abstraction instead of selecting concrete factories throughout the code.

## Mitigation hint

> Introduce an Abstract Factory interface so related product families are created through a unified hierarchy

## Tags

`abstract-factory` `factory` `creation`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
