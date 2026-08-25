# RICA-V319 — Monolithic Pipeline

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMonolithicPipeline` (DesignPatternAnalyzer) |
| Layer | service / validator |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V321`](./RICA-V321.md) |
| Source | `src/designPatternAnalyzer.ts:965` |

## Trigger

A method contains at least the configured number of sequential top-level guard or validation clauses across distinct targets.

## Why it matters

Long linear validation blocks are hard to reorder, reuse, or configure. Chain of Responsibility turns each guard into a focused handler and makes the pipeline explicit.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Separation of concerns](../concepts/separation-of-concerns.md) - Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.
- [Validation and error boundaries](../concepts/validation-and-error-boundaries.md) - Learn where validation, exception mapping, and HTTP error shape should live.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract each validation step into a handler.**
   This keeps the code aligned with the service / validator responsibility expected by RICA-V319.
2. **Compose handlers in the required order.**
   This keeps the code aligned with the service / validator responsibility expected by RICA-V319.
3. **Keep simple one-target null guard ladders inline when they are only defensive navigation.**
   This keeps the code aligned with the service / validator responsibility expected by RICA-V319.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V319 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Decompose the linear guard/validation chain into configurable Chain-of-Responsibility handlers

## Tags

`chain-of-responsibility` `validation` `guards`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
