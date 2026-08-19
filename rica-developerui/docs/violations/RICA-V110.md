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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Controllers are the entry point of your application, not HTTP clients to third parties. Making HTTP calls directly couples the controller to external services, complicates testing (network is now required), and breaks the single responsibility: gateways should own outbound communication.

## How to fix

1. Move the HTTP client into a dedicated gateway/client service.
2. Inject that gateway into the controller.
3. Controller delegates outbound calls to the gateway.

## Mitigation hint

> Delegate HTTP calls to a dedicated gateway service class injected into the controller

## Tags

`http` `gateway` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
