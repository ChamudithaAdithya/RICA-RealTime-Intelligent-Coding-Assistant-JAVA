# RICA-V402 - Cross-Layer Violation

<Badge type="warning" text="Warning" />

> **Stage**: Stage 2 - Cross-File Graph Rules (CrossFileAnalyzer)

| | |
| --- | --- |
| Detector | `crossLayerViolationRule (dependencyGraph.ts)` (CrossFileAnalyzer) |
| Layer | cross-layer |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V401`](./RICA-V401.md), [`RICA-V403`](./RICA-V403.md), [`RICA-V501`](./RICA-V501.md) |
| Source | `src/dependencyGraph.ts:732` |

## Trigger

A forbidden dependency edge in the graph: service→controller, entity→controller, entity→service, repository→controller, or repository→view.

### Violating example

```
// service/OrderService.java
import com.foo.presentation.OrderController;

@Service
public class OrderService {
    public void notify() {
        new OrderController().send(); // service reaches up to the HTTP layer
    }
}
```


### Fixed version

```
// Move the reversal: the controller calls the service.
@RestController
public class OrderController {
    private final OrderService orderService;

    public void notify() {
        orderService.notifySubscribers();
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- // service/OrderService.java
- import com.foo.presentation.OrderController;
+ // Move the reversal: the controller calls the service.
+ @RestController
+ public class OrderController {
+     private final OrderService orderService;

- @Service
- public class OrderService {
      public void notify() {
-         new OrderController().send(); // service reaches up to the HTTP layer
+         orderService.notifySubscribers();
      }
  }
```


## Why it matters

Dependencies must point inward (Controller → Service → Repository → persistence). Any edge that points upward or sideways breaks the layered architecture: lower layers stop being reusable, tests can no longer isolate a layer, and changes ripple in both directions.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Repository pattern](../concepts/repository-pattern.md) - Learn what belongs in repositories and why query annotations belong at the persistence boundary.
- [Dependency graphs and cycles](../concepts/dependency-graphs-and-cycles.md) - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.
- [Package boundaries](../concepts/package-boundaries.md) - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `cross-layer`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Identify which direction the dependency should flow (lower layers never know about higher ones).**
   This keeps the code aligned with the cross-layer responsibility expected by RICA-V402.
2. **Move the upward reference into the appropriate service or introduce an interface in the lower layer.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **Verify the new edge set against the allowed dependency matrix.**
   This keeps the code aligned with the cross-layer responsibility expected by RICA-V402.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V402 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Restructure the dependency to follow the layered architecture (Controller → Service → Repository)

## Tags

`layering` `dependency` `graph`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
