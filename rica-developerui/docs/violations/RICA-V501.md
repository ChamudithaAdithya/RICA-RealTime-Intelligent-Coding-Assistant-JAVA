# RICA-V501 — Package Boundary Violation

<Badge type="danger" text="Error" />

> **Stage**: Stage 3 — Package Boundary (PackageBoundaryAnalyzer)

| | |
| --- | --- |
| Detector | `PackageBoundaryAnalyzer` (PackageBoundaryAnalyzer) |
| Layer | package / top-level layer |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V402`](./RICA-V402.md), [`RICA-V403`](./RICA-V403.md) |
| Source | `src/packageBoundaryDetector.ts:63` |

## Trigger

A file residing in layer A imports a type that lives in layer B, where B is not in A's `allowedDeps`. Example: an `application/` class importing a `presentation/` controller.

### Before (violates)

```
// application/OrderService.java
import com.foo.presentation.UserController; // outer layer import — not allowed

@Service
public class OrderService {
    public void register(UserController controller) { ... }
}
```


### After (fixed)

```
// application/OrderService.java depends only inward
import com.foo.domain.model.Order;

@Service
public class OrderService {
    public Order register(OrderRequest request) { ... }
}
// presentation/UserController.java calls the service (allowed direction)
```


## Why it matters

Package boundaries encode the architecture (Clean Architecture / Dependency Rule). Allowing an inner layer to depend on an outer one makes the dependency graph spiral outward and prevents the inner layer from being reused, extracted, or tested in isolation.

## How to fix

1. Move the type that is being depended on toward the inner layer, or depend on its interface.
2. Invert the dependency so the outer layer depends on the inner one.
3. Adjust `layerBoundaries.allowedDeps` only when the boundary definition itself is wrong.

## Mitigation hint

> Restructure the dependency: the source layer must not depend on the target layer. Move the type or invert the dependency.

## Tags

`package` `layering` `clean-architecture`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
