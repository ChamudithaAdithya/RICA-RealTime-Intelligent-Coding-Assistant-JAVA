# RICA-V311 — Missing Prototype

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingPrototype` (DesignPatternAnalyzer) |
| Layer | service / mapper |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V312`](./RICA-V312.md) |
| Source | `src/designPatternAnalyzer.ts:691` |

## Trigger

A method manually copies several matching fields with getter-to-setter pairs instead of using a clone, copy constructor, or mapper abstraction.

## Why it matters

Manual field copying is brittle. New fields are easy to forget, copy semantics are duplicated, and deep-copy behavior becomes inconsistent across the codebase.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Use a copy constructor, clone method, or explicit copy factory.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
2. **For DTO mapping, use a dedicated mapper and keep it exempt from prototype findings.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
3. **Keep deep-copy behavior in one reviewed implementation.**
   This keeps the code aligned with the service / mapper responsibility expected by RICA-V311.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V311 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Copy objects via clone()/copy constructors (Prototype) instead of manual field-by-field getter-to-setter copying

## Tags

`prototype` `copy` `mapping`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
