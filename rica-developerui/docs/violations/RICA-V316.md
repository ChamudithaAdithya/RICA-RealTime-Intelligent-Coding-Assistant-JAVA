# RICA-V316 - Scattered State Machine

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 - Design Pattern Compliance (DesignPatternAnalyzer)

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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Domain model vs anemic model](../concepts/domain-model-vs-anemic-model.md) - Learn where domain invariants belong and when entities become too passive or too busy.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `domain / service`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Design-pattern rules are heuristic. They detect strong design smells, not absolute proof. Prefer a small refactor only when the pattern removes real duplication, coupling, or lifecycle risk.


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
