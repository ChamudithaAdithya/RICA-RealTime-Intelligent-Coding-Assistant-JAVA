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

1. Extract logging, metrics, tracing, or audit behavior into a decorator/advisor.
2. Keep the core service method focused on business work.
3. Apply the decorator consistently at composition time.

## Mitigation hint

> Extract cross-cutting concerns (logging, metrics, tracing, audit) into dedicated decorators or AOP advisors

## Tags

`decorator` `aop` `cross-cutting`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
