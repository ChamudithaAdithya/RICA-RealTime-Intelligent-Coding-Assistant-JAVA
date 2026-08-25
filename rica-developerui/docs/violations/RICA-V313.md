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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Structural patterns](../concepts/structural-patterns.md) - Learn Adapter, Facade, Proxy, Decorator, and Composite as ways to shape dependencies between objects.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.

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
