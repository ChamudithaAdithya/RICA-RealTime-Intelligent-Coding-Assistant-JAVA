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

### Before (violates)

```
// In a Service
public String lookup(long id) {
    UserRepository repo = new UserRepository();
    return repo.findById(id);
}
```


### After (fixed)

```
// In a Service — inject instead
@Autowired
private UserRepository userRepository;

public String lookup(long id) {
    return userRepository.findById(id);
}
```


## Why it matters

Directly instantiating collaborators bypasses the DI container. The class is hard-wired to a concrete implementation and a lifecycle it does not own, which couples layers together and makes unit testing (mocking the collaborator) impossible. The container should decide construction so the class stays decoupled, testable, and replaceable.

## How to fix

1. Remove the `new` statement.
2. Add a field of the collaborator type to the class.
3. Annotate it with `@Autowired`, `@Inject`, or `@Resource`, or pass it through the constructor.
4. Keep the container responsible for wiring.

## Mitigation hint

> Use dependency injection (@Autowired/@Inject) instead of directly instantiating with new()

## Tags

`di` `instantiation` `service` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
