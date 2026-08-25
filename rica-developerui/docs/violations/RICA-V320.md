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

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Ports and Adapters](../concepts/ports-and-adapters.md) - Learn inbound ports, outbound ports, and adapter placement in hexagonal architecture.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.

## Common framework cases

### ApplicationContext.getBean or service locator used in business code

**When you see this:** A service/controller asks the container for dependencies dynamically.

**Do this:**

1. Inject the dependency directly through the constructor.
2. If selection is dynamic, inject a map/list of strategies and choose by key.
3. Keep `getBean` usage in configuration/bootstrap code only.

**Avoid:** Do not hide dependencies behind service lookup. It makes tests and architecture analysis weaker.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Declare the dependency as a constructor parameter or injected field.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
2. **Keep dynamic bean lookup in configuration/composition code only.**
   This keeps the code aligned with the any (outside @Configuration) responsibility expected by RICA-V320.
3. **Replace generic locator access with typed ports where possible.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V320 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Inject dependencies constructor/field-style instead of looking them up via ApplicationContext/ServiceLocator

## Tags

`service-locator` `dependency-injection` `spring`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
