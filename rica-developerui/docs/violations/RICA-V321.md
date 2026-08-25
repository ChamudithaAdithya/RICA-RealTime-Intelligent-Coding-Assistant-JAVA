# RICA-V321 - Excessive Null Checks

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 - Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkExcessiveNullChecks` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V319`](./RICA-V319.md) |
| Source | `src/designPatternAnalyzer.ts:1044` |

## Trigger

A method performs at least the configured number of null checks across multiple distinct target roots.

## Why it matters

Scattered null checks usually mean upstream contracts are unclear. Null Objects, Optional return types, and empty collections make absence explicit and reduce defensive boilerplate.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.
- [API boundary design](../concepts/api-boundary-design.md) - Learn request/response contracts, versioning, sensitive data leaks, and client-facing stability.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `any`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Design-pattern rules are heuristic. They detect strong design smells, not absolute proof. Prefer a small refactor only when the pattern removes real duplication, coupling, or lifecycle risk.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Return empty collections instead of null collections.**
   This keeps the code aligned with the any responsibility expected by RICA-V321.
2. **Use Optional at boundaries where absence is expected.**
   This keeps the code aligned with the any responsibility expected by RICA-V321.
3. **Introduce Null Object defaults for common nullable collaborators.**
   This keeps the code aligned with the any responsibility expected by RICA-V321.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V321 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Replace repetitive null checks with Optional, Null Objects, or empty collections at the source

## Tags

`null-object` `optional` `defensive-code`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
