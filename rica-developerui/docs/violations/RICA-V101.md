# RICA-V101 — Self-Instantiation

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ServiceLayerAnalyzer` (ServiceLayer) |
| Layer | service / controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V102`](./RICA-V102.md), [`RICA-V103`](./RICA-V103.md), [`RICA-V205`](./RICA-V205.md) |
| Source | `src/serviceLayerDetector.ts:120` |

## Trigger

A Service or Controller method uses `new` to construct a Repository, DAO, concrete ServiceImpl, or infrastructure class directly, instead of receiving it through dependency injection.

### Violating example

```
// In a Service
public String lookup(long id) {
    UserRepository repo = new UserRepository();
    return repo.findById(id);
}
```


### Fixed version

```
// In a Service — inject instead
@Autowired
private UserRepository userRepository;

public String lookup(long id) {
    return userRepository.findById(id);
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- // In a Service
+ // In a Service — inject instead
+ @Autowired
+ private UserRepository userRepository;
+
  public String lookup(long id) {
-     UserRepository repo = new UserRepository();
-     return repo.findById(id);
+     return userRepository.findById(id);
  }
```


## Why it matters

Directly instantiating collaborators bypasses the DI container. The class is hard-wired to a concrete implementation and a lifecycle it does not own, which couples layers together and makes unit testing (mocking the collaborator) impossible. The container should decide construction so the class stays decoupled, testable, and replaceable.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Infrastructure](../concepts/infrastructure.md) - Learn what infrastructure means in RICA: databases, HTTP clients, message brokers, files, SDKs, and framework adapters.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Remove the `new` statement.**
   This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.
2. **Add a field of the collaborator type to the class.**
   This keeps the code aligned with the service / controller responsibility expected by RICA-V101.
3. **Annotate it with `@Autowired`, `@Inject`, or `@Resource`, or pass it through the constructor.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
4. **Keep the container responsible for wiring.**
   This keeps the code aligned with the service / controller responsibility expected by RICA-V101.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V101 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Use dependency injection (@Autowired/@Inject) instead of directly instantiating with new()

## Tags

`di` `instantiation` `service` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
