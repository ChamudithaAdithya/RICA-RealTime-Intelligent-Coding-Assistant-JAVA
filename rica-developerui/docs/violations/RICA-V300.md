# RICA-V300 — Unmapped Design-Pattern Rule (fallback)

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Fallback

| | |
| --- | --- |
| Detector | `DesignPatternAnalyzer (fallback)` (DesignPatternAnalyzer) |
| Layer | design-pattern |
| Configuration | Not configurable (always on) |
| Related rules | — |
| Source | `src/designPatternAnalyzer.ts:70` |

## Trigger

Any design-pattern rule type that is not mapped to a specific code. Currently unreachable because every emitted rule type has a dedicated code.

## Why it matters

Safety net for future design-pattern rules so they surface as visible violations rather than being swallowed. New rules should be documented with a real code.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Map the new rule type in `DP_RULE_CODES` and document it.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V300 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Map the design-pattern rule to a specific documented violation code

## Tags

`fallback` `design-pattern` `internal`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
