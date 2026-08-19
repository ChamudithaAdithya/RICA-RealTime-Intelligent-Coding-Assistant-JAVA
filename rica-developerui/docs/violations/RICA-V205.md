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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Resources must receive services through the DI container. Manual instantiation hard-codes concrete implementations, defeats mocking, and ties the HTTP layer to a specific construction path.

## How to fix

1. Inject services via constructor or `@Autowired`.
2. Never `new` a service inside a resource method.

## Mitigation hint

> Inject the Service via constructor instead of instantiating it

## Tags

`di` `service` `api`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
