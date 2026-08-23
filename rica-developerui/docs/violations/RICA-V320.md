# RICA-V320 — Service Locator

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkServiceLocator` (DesignPatternAnalyzer) |
| Layer | any (outside @Configuration) |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V101`](./RICA-V101.md), [`RICA-V103`](./RICA-V103.md) |
| Source | `src/designPatternAnalyzer.ts:1005` |

## Trigger

Code outside configuration dynamically looks up dependencies through ApplicationContext, BeanFactory, ServiceLocator, Registry, or similar APIs.

## Why it matters

Service Locator hides dependencies until runtime and makes tests depend on container state. Constructor or field injection keeps dependencies explicit and replaceable.

## How to fix

1. Declare the dependency as a constructor parameter or injected field.
2. Keep dynamic bean lookup in configuration/composition code only.
3. Replace generic locator access with typed ports where possible.

## Mitigation hint

> Inject dependencies constructor/field-style instead of looking them up via ApplicationContext/ServiceLocator

## Tags

`service-locator` `dependency-injection` `spring`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
