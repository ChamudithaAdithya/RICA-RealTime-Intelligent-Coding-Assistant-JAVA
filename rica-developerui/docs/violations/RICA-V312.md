# RICA-V312 - Fragmented Factories

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 - Design Pattern Compliance (DesignPatternAnalyzer)

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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `factory`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Design-pattern rules are heuristic. They detect strong design smells, not absolute proof. Prefer a small refactor only when the pattern removes real duplication, coupling, or lifecycle risk.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Introduce a common factory interface.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Group related product creation behind that interface.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
3. **Inject the abstraction instead of selecting concrete factories throughout the code.**
   This makes the dependency explicit and lets the container supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V312 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Introduce an Abstract Factory interface so related product families are created through a unified hierarchy

## Tags

`abstract-factory` `factory` `creation`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
