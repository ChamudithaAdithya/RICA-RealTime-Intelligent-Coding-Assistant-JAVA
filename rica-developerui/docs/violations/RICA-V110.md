# RICA-V110 — Direct HTTP Call

<Badge type="danger" text="Error" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer` (ControllerLayer) |
| Layer | controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V103`](./RICA-V103.md), [`RICA-V301`](./RICA-V301.md) |
| Source | `src/controllerLayerDetector.ts:199` |

## Trigger

A Controller method creates or calls an HTTP client type (RestTemplate, WebClient, HttpClient, OkHttpClient, HttpURLConnection, etc.) directly.

### Violating example

```
@RestController
public class PaymentController {
    @PostMapping("/pay")
    public String pay() {
        RestTemplate rt = new RestTemplate();
        return rt.getForObject("https://api.payment.io/charge", String.class);
    }
}
```


### Fixed version

```
@RestController
public class PaymentController {
    private final PaymentGateway paymentGateway;

    public PaymentController(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    @PostMapping("/pay")
    public String pay() {
        return paymentGateway.charge();
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class PaymentController {
+     private final PaymentGateway paymentGateway;
+
+     public PaymentController(PaymentGateway paymentGateway) {
+         this.paymentGateway = paymentGateway;
+     }
+
      @PostMapping("/pay")
      public String pay() {
-         RestTemplate rt = new RestTemplate();
-         return rt.getForObject("https://api.payment.io/charge", String.class);
+         return paymentGateway.charge();
      }
  }
```


## Why it matters

Controllers are the entry point of your application, not HTTP clients to third parties. Making HTTP calls directly couples the controller to external services, complicates testing (network is now required), and breaks the single responsibility: gateways should own outbound communication.

## Common framework cases

### RestTemplate/WebClient/HttpClient inside a controller

**When you see this:** The endpoint method directly calls another HTTP service.

**Do this:**

1. Create a gateway/client service such as `PaymentGateway` or `InventoryClient`.
2. Move `RestTemplate`, `WebClient`, `HttpClient`, URL construction, retry handling, and response parsing into that gateway.
3. Inject the gateway into the controller or application service.

**Avoid:** Do not keep remote API protocol details inside controller methods.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Move the HTTP client into a dedicated gateway/client service.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
2. **Inject that gateway into the controller.**
   This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.
3. **Controller delegates outbound calls to the gateway.**
   This keeps the code aligned with the controller responsibility expected by RICA-V110.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V110 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Delegate HTTP calls to a dedicated gateway service class injected into the controller

## Tags

`http` `gateway` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
