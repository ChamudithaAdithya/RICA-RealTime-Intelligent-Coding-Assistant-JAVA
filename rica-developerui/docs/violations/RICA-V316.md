# RICA-V316 — Scattered State Machine

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkScatteredStateMachine` (DesignPatternAnalyzer) |
| Layer | domain / service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V303`](./RICA-V303.md) |
| Source | `src/designPatternAnalyzer.ts:848` |

## Trigger

The same status/state comparisons appear across at least the configured number of classes.

## Why it matters

State transition rules scattered across classes drift over time. Encapsulating state-specific behavior keeps transitions explicit, local, and easier to test.

## How to fix

1. Identify the state enum or discriminator.
2. Move state-specific behavior into State objects or a transition table.
3. Make callers delegate to the state abstraction instead of branching directly.

## Mitigation hint

> Encapsulate status/state transitions in State objects instead of scattering hardcoded enum comparisons

## Tags

`state` `state-machine` `conditional`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
