# RICA-V205 — Direct Service Instantiation

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V101`](./RICA-V101.md), [`RICA-V103`](./RICA-V103.md) |
| Source | `src/apiResourceLayerDetector.ts:92` |

## Trigger

An API resource has a service field without injection, or a resource method `new`s a service/repository/infrastructure class or calls one through an uninjected reference.

### Violating example

```
@RestController
public class ReportController {
    @GetMapping("/report")
    public String report() {
        ReportService svc = new ReportService(); // hard-coded
        return svc.build();
    }
}
```


### Fixed version

```
@RestController
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/report")
    public String report() {
        return reportService.build();
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class ReportController {
+     private final ReportService reportService;
+
+     public ReportController(ReportService reportService) {
+         this.reportService = reportService;
+     }
+
      @GetMapping("/report")
      public String report() {
-         ReportService svc = new ReportService(); // hard-coded
-         return svc.build();
+         return reportService.build();
      }
  }
```


## Why it matters

Resources must receive services through the DI container. Manual instantiation hard-codes concrete implementations, defeats mocking, and ties the HTTP layer to a specific construction path.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency injection](../concepts/dependency-injection.md) - Understand constructor injection, field injection, containers, and why direct new calls are risky.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.
- [Service Layer pattern](../concepts/service-layer-pattern.md) - Learn why business use cases should be orchestrated in services rather than controllers or repositories.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.

## Common framework cases

### Controller creates service with new

**When you see this:** A controller method uses `new OrderService()` or `new PaymentServiceImpl()`.

**Do this:**

1. Register the service as a Spring bean with `@Service` or configuration.
2. Inject it into the controller through the constructor.
3. Remove direct construction from the endpoint method.

**Avoid:** Do not make the service static/global to bypass dependency injection.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Inject services via constructor or `@Autowired`.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
2. **Never `new` a service inside a resource method.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V205 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Inject the Service via constructor instead of instantiating it

## Tags

`di` `service` `api`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
