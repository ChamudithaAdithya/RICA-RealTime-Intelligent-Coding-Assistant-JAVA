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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Structural patterns](../concepts/structural-patterns.md) - Learn Adapter, Facade, Proxy, Decorator, and Composite as ways to shape dependencies between objects.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract a shared component interface.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Move type-specific behavior behind polymorphic implementations.**
   This keeps the code aligned with the domain / service responsibility expected by RICA-V314.
3. **Iterate over the component abstraction instead of branching with `instanceof`.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V314 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Expose a uniform Component interface so leaves and containers are treated identically - drop instanceof/loop branching

## Tags

`composite` `instanceof` `polymorphism`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
