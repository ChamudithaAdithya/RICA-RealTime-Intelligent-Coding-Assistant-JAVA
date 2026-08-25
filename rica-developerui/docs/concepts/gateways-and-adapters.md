# Gateways And Adapters

A gateway is a local interface that represents an external capability. An adapter is the implementation that talks to the real external system.

This is useful when code needs payment, email, inventory, storage, identity, or another external service.

## Gateway Interface

The gateway says what the application needs:

```java
public interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

## Adapter Implementation

The adapter knows how to do it with a specific tool:

```java
@Component
class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient client;

    public PaymentResult charge(PaymentCommand command) {
        StripeChargeRequest request = toStripeRequest(command);
        StripeChargeResponse response = client.charge(request);
        return toPaymentResult(response);
    }
}
```

## Why This Helps

The service can be tested with a fake gateway:

```java
class FakePaymentGateway implements PaymentGateway {
    public PaymentResult charge(PaymentCommand command) {
        return PaymentResult.approved("test-id");
    }
}
```

No network, SDK, credentials, or real payment provider is needed.

## Why RICA Cares

Rules that mention HTTP clients, SDK leakage, or infrastructure dependencies often expect this refactor. The exact external technology is not the application's business rule, so it should be isolated.

## Common Mistakes

- Naming a class `PaymentGateway` but still returning SDK objects from it.
- Injecting the concrete adapter everywhere instead of the gateway interface.
- Putting mapping code in the service instead of the adapter.
- Letting controller code build vendor-specific requests.

## Practical Fix Rule

Application code depends on the gateway. Infrastructure code implements the gateway.

