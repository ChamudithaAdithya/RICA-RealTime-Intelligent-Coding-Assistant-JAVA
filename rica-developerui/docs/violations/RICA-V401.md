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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Controllers should only reach the persistence layer through services, which carry the business rules and transactional boundaries. A direct controller→repository edge lets HTTP concerns and data access bypass the domain entirely, leading to duplicated logic and inconsistent invariants.

## How to fix

1. Move the repository call into a service method.
2. Inject the service into the controller.
3. Call the service from the controller and let it touch the repository.

## Mitigation hint

> Inject the Repository through a Service layer instead of accessing it directly from the Controller

## Tags

`layering` `controller` `repository` `graph`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
