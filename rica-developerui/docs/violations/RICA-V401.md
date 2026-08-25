# RICA-V401 — Controller Bypass

<Badge type="danger" text="Error" />

> **Stage**: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)

| | |
| --- | --- |
| Detector | `controllerBypassRule (dependencyGraph.ts)` (CrossFileAnalyzer) |
| Layer | controller → repository |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V103`](./RICA-V103.md), [`RICA-V114`](./RICA-V114.md), [`RICA-V402`](./RICA-V402.md) |
| Source | `src/dependencyGraph.ts:549` |

## Trigger

A Controller directly calls, holds (has-a), or uses a Repository node in the project dependency graph instead of going through a Service.

### Violating example

```
@RestController
public class OrderController {
    @Autowired private OrderRepository orderRepository; // injects repo directly

    @GetMapping("/orders/recent")
    public List<Order> recent() {
        return orderRepository.findRecent(); // bypasses the service layer
    }
}
```


### Fixed version

```
@RestController
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/orders/recent")
    public List<Order> recent() {
        return orderService.recentOrders(); // service owns persistence
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class OrderController {
-     @Autowired private OrderRepository orderRepository; // injects repo directly
+     private final OrderService orderService;

+     public OrderController(OrderService orderService) {
+         this.orderService = orderService;
+     }
+
      @GetMapping("/orders/recent")
      public List<Order> recent() {
-         return orderRepository.findRecent(); // bypasses the service layer
+         return orderService.recentOrders(); // service owns persistence
      }
  }
```


## Why it matters

Controllers should only reach the persistence layer through services, which carry the business rules and transactional boundaries. A direct controller→repository edge lets HTTP concerns and data access bypass the domain entirely, leading to duplicated logic and inconsistent invariants.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Package boundaries](../concepts/package-boundaries.md) - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.
- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move the repository call into a service method.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Inject the service into the controller.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
3. **Call the service from the controller and let it touch the repository.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V401 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Inject the Repository through a Service layer instead of accessing it directly from the Controller

## Tags

`layering` `controller` `repository` `graph`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
