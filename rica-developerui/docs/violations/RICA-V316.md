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

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Identify the state enum or discriminator.**
   This replaces branching with named behaviors, making each variation easier to test and change independently.
2. **Move state-specific behavior into State objects or a transition table.**
   This replaces branching with named behaviors, making each variation easier to test and change independently.
3. **Make callers delegate to the state abstraction instead of branching directly.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V316 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Encapsulate status/state transitions in State objects instead of scattering hardcoded enum comparisons

## Tags

`state` `state-machine` `conditional`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
