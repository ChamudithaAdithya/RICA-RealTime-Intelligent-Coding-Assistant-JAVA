# RICA-V313 — Missing Decorator

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingDecorator` (DesignPatternAnalyzer) |
| Layer | service / application |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V318`](./RICA-V318.md) |
| Source | `src/designPatternAnalyzer.ts:767` |

## Trigger

A method interleaves repeated cross-cutting calls such as logging, metrics, tracing, or audit with business calls.

## Why it matters

Cross-cutting behavior embedded in business methods is duplicated and easy to apply inconsistently. Decorators or AOP advisors keep those concerns composable and testable.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract logging, metrics, tracing, or audit behavior into a decorator/advisor.**
   This keeps the code aligned with the service / application responsibility expected by RICA-V313.
2. **Keep the core service method focused on business work.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **Apply the decorator consistently at composition time.**
   This keeps the code aligned with the service / application responsibility expected by RICA-V313.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V313 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Extract cross-cutting concerns (logging, metrics, tracing, audit) into dedicated decorators or AOP advisors

## Tags

`decorator` `aop` `cross-cutting`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
