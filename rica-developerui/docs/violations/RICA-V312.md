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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Introduce a common factory interface.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Group related product creation behind that interface.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
3. **Inject the abstraction instead of selecting concrete factories throughout the code.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.

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
