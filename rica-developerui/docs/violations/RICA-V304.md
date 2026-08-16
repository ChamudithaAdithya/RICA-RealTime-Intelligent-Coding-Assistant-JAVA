# RICA-V304 — Factory Missing

<Badge type="danger" text="Error" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingFactory` (DesignPatternAnalyzer) |
| Layer | service / application |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V101`](./RICA-V101.md), [`RICA-V303`](./RICA-V303.md) |
| Source | `src/designPatternAnalyzer.ts:283` |

## Trigger

The same concrete class is created with `new` from at least 3 different callers and the class implements an interface or extends a base class. Classes named `*Builder` are skipped.

### Before (violates)

```
// new PaymentGateway() appears in 3+ services
@Autowired private String apiKey;
// each service: new PaymentGateway(apiKey, "prod", client)
```


### After (fixed)

```
@Configuration
public class GatewayConfig {
    @Bean
    public PaymentGateway paymentGateway(...) {
        return new PaymentGateway(...);
    }
}
// services inject PaymentGateway
```


## Why it matters

Repeated construction in many callers couples every caller to the concrete type and its construction details. A factory centralizes object creation, hides wiring, and lets callers depend on the abstraction only.

## How to fix

1. Introduce a Factory or a provider that builds the object.
2. Have callers receive the factory (or the instance) through DI.
3. Depends on the abstraction, never on the concrete constructor.

## Mitigation hint

> Extract object creation behind a Factory — callers should depend on the interface, not the concrete class

## Tags

`factory` `creation` `dependency-injection`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
