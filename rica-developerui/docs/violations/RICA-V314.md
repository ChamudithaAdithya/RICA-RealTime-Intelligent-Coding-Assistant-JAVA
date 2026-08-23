# RICA-V314 — Missing Composite

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingComposite` (DesignPatternAnalyzer) |
| Layer | domain / service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V303`](./RICA-V303.md) |
| Source | `src/designPatternAnalyzer.ts:795` |

## Trigger

A loop branches on multiple `instanceof` checks to handle leaf and container-like objects differently.

## Why it matters

Repeated type checks make tree-like structures hard to extend. A Composite interface lets leaves and containers expose one operation so clients stop branching on concrete types.

## How to fix

1. Extract a shared component interface.
2. Move type-specific behavior behind polymorphic implementations.
3. Iterate over the component abstraction instead of branching with `instanceof`.

## Mitigation hint

> Expose a uniform Component interface so leaves and containers are treated identically - drop instanceof/loop branching

## Tags

`composite` `instanceof` `polymorphism`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
