# RICA-V309 — Fat Interface

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkFatInterface` (DesignPatternAnalyzer) |
| Layer | interface |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V307`](./RICA-V307.md), [`RICA-V302`](./RICA-V302.md) |
| Source | `src/designPatternAnalyzer.ts:588` |

## Trigger

An interface declares more methods than the configured limit, or clients use less than half of a reasonably sized interface surface.

## Why it matters

Large interfaces force clients to depend on operations they do not use. This violates the Interface Segregation Principle and makes changes ripple through unrelated callers.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Split the interface by cohesive responsibilities.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Point each client at the smallest interface it actually needs.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
3. **Keep broad facade contracts separate from focused domain ports.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V309 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Split this interface by responsibility (ISP) - clients should depend only on the methods they actually use

## Tags

`isp` `interface` `solid`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
