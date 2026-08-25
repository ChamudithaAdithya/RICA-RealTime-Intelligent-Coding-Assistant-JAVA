# RICA-V501 - Package Boundary Violation

<Badge type="danger" text="Error" />

> **Stage**: Stage 3 - Package Boundary (PackageBoundaryAnalyzer)

| | |
| --- | --- |
| Detector | `PackageBoundaryAnalyzer` (PackageBoundaryAnalyzer) |
| Layer | package / top-level layer |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V402`](./RICA-V402.md), [`RICA-V403`](./RICA-V403.md) |
| Source | `src/packageBoundaryDetector.ts:63` |

## Trigger

A file residing in layer A imports a type that lives in layer B, where B is not in A's `allowedDeps`. Example: an `application/` class importing a `presentation/` controller.

### Violating example

```
// application/OrderService.java
import com.foo.presentation.UserController; // outer layer import - not allowed

@Service
public class OrderService {
    public void register(UserController controller) { ... }
}
```


### Fixed version

```
// application/OrderService.java depends only inward
import com.foo.domain.model.Order;

@Service
public class OrderService {
    public Order register(OrderRequest request) { ... }
}
// presentation/UserController.java calls the service (allowed direction)
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- // application/OrderService.java
- import com.foo.presentation.UserController; // outer layer import - not allowed
+ // application/OrderService.java depends only inward
+ import com.foo.domain.model.Order;

  @Service
  public class OrderService {
-     public void register(UserController controller) { ... }
+     public Order register(OrderRequest request) { ... }
  }
+ // presentation/UserController.java calls the service (allowed direction)
```


## Why it matters

Package boundaries encode the architecture (Clean Architecture / Dependency Rule). Allowing an inner layer to depend on an outer one makes the dependency graph spiral outward and prevents the inner layer from being reused, extracted, or tested in isolation.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Package boundaries](../concepts/package-boundaries.md) - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Ports and Adapters](../concepts/ports-and-adapters.md) - Learn inbound ports, outbound ports, and adapter placement in hexagonal architecture.
- [Dependency graphs and cycles](../concepts/dependency-graphs-and-cycles.md) - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.

## Common framework cases

### Spring Data imports such as @Query, @Modifying, @Param

**When you see this:** The highlighted import is `org.springframework.data.jpa.repository.Query`, `org.springframework.data.jpa.repository.Modifying`, `org.springframework.data.repository.query.Param`, or another repository-only Spring Data type.

**Do this:**

1. Check the package of the current file first. If it is an application/service class, move the annotated method into a repository interface under the repository/infrastructure layer.
2. Let the service call that repository through constructor injection instead of owning `@Query` or `@Modifying` directly.
3. If the current file is already a repository and RICA still reports V501 for the Spring framework import, treat the layer boundary config as too broad. Add/adjust framework-package allowances instead of moving the code.

**Avoid:** Do not put JPA query annotations in controllers, services, DTOs, entities, or domain objects just to make the code convenient. They belong at the persistence boundary.

### Controller annotations imported into service/domain code

**When you see this:** The import is a Spring MVC/Web annotation such as `@RestController`, `@RequestMapping`, `@GetMapping`, `ResponseEntity`, or `HttpServletRequest`.

**Do this:**

1. Move request mapping, HTTP status, headers, and servlet objects back to the presentation/controller layer.
2. Pass plain command/query DTOs or primitives into the service.
3. Return a domain result or response DTO from the service, then convert it to HTTP response shape in the controller.

**Avoid:** Do not make the service depend on HTTP classes. That makes the application layer impossible to reuse outside REST.

### Repository/domain import from the wrong direction

**When you see this:** An inner layer imports an outer-layer implementation, or a lower-level package imports an application/service package.

**Do this:**

1. Move shared contracts inward as interfaces or simple DTO/value types.
2. Implement those contracts outward in infrastructure or presentation.
3. Inject the inward-facing interface where the dependency is needed.

**Avoid:** Do not fix this by simply adding the outer layer to `allowedDeps` unless the architecture rule itself is wrong for your project.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `package / top-level layer`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Package-boundary findings are usually real when an inner layer imports an outer layer. They may be configuration issues when framework imports are valid for the current package, such as Spring Data annotations inside a repository.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move the type that is being depended on toward the inner layer, or depend on its interface.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Invert the dependency so the outer layer depends on the inner one.**
   This keeps the code aligned with the package / top-level layer responsibility expected by RICA-V501.
3. **Adjust `layerBoundaries.allowedDeps` only when the boundary definition itself is wrong.**
   This keeps the code aligned with the package / top-level layer responsibility expected by RICA-V501.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V501 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Restructure the dependency: the source layer must not depend on the target layer. Move the type or invert the dependency.

## Tags

`package` `layering` `clean-architecture`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
