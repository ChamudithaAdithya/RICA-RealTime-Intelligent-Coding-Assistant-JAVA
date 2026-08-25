# RICA-V400 — Unmapped Graph Rule (fallback)

<Badge type="warning" text="Warning" />

> **Stage**: Stage 2 — Fallback

| | |
| --- | --- |
| Detector | `CrossFileAnalyzer (fallback)` (CrossFileAnalyzer) |
| Layer | cross-file |
| Configuration | Not configurable (always on) |
| Related rules | — |
| Source | `src/crossFileAnalyzer.ts:32` |

## Trigger

Any cross-file rule whose rule id is not mapped to a specific code. Currently reachable only if a new AnalyzerRule is registered without a `CROSS_FILE_CODE_MAP` entry.

## Why it matters

Acts as a safety net so an unregistered graph rule is still surfaced to the user rather than silently swallowed. New rules should always be documented with a real code.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Add the new rule id to `CROSS_FILE_CODE_MAP` and give it a documented code.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
2. **Or map the rule to an existing architectural code.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V400 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Map the graph rule to a specific documented violation code

## Tags

`fallback` `graph` `internal`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
