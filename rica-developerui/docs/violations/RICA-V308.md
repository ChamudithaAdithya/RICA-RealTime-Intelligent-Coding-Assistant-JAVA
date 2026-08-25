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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move complex construction into a Builder, Factory, or assembler.**
   This moves construction policy into one named place, so callers do not repeat object setup rules.
2. **Keep branching decisions out of constructor argument lists.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
3. **Inject the factory/builder when construction requires external policy.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V308 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Extract complex object initialization into a Builder or Factory so business methods stay focused on orchestration

## Tags

`builder` `factory` `construction`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
