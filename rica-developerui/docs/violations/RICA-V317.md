# RICA-V317 — Duplicate Algorithm

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkDuplicateAlgorithm` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V303`](./RICA-V303.md), [`RICA-V323`](./RICA-V323.md) |
| Source | `src/designPatternAnalyzer.ts:879` |

## Trigger

Two methods in different classes have highly similar call sequences while varying receiver types or sub-steps.

## Why it matters

Duplicated algorithm skeletons drift independently. Template Method keeps the invariant sequence in one place and lets subclasses or collaborators supply the varying steps.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Domain model vs anemic model](../concepts/domain-model-vs-anemic-model.md) - Learn where domain invariants belong and when entities become too passive or too busy.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract the common call sequence into a shared template method.**
   This keeps the code aligned with the any responsibility expected by RICA-V317.
2. **Move differing operations behind abstract hooks or strategy collaborators.**
   This replaces branching with named behaviors, making each variation easier to test and change independently.
3. **Keep only true variation points outside the template.**
   This keeps the code aligned with the any responsibility expected by RICA-V317.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V317 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Extract the common skeleton into a Template Method and vary only the differing sub-steps per class

## Tags

`template-method` `duplication` `algorithm`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
