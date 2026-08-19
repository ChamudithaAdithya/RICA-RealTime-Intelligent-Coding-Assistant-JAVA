# RICA-V402 — Cross-Layer Violation

<Badge type="warning" text="Warning" />

> **Stage**: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)

| | |
| --- | --- |
| Detector | `crossLayerViolationRule (dependencyGraph.ts)` (CrossFileAnalyzer) |
| Layer | cross-layer |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V401`](./RICA-V401.md), [`RICA-V403`](./RICA-V403.md), [`RICA-V501`](./RICA-V501.md) |
| Source | `src/dependencyGraph.ts:732` |

## Trigger

A forbidden dependency edge in the graph: service→controller, entity→controller, entity→service, repository→controller, or repository→view.

### Before (violates)

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


### After (fixed)

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


## Why it matters

Dependencies must point inward (Controller → Service → Repository → persistence). Any edge that points upward or sideways breaks the layered architecture: lower layers stop being reusable, tests can no longer isolate a layer, and changes ripple in both directions.

## How to fix

1. Identify which direction the dependency should flow (lower layers never know about higher ones).
2. Move the upward reference into the appropriate service or introduce an interface in the lower layer.
3. Verify the new edge set against the allowed dependency matrix.

## Mitigation hint

> Restructure the dependency to follow the layered architecture (Controller → Service → Repository)

## Tags

`layering` `dependency` `graph`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
