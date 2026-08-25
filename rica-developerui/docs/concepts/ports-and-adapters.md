# Ports And Adapters

Ports and Adapters, also called Hexagonal Architecture, keeps application logic in the center and technical details at the edge.

## Ports

A port is an interface that describes an action the application needs.

Inbound ports describe use cases:

```java
public interface CreateOrderUseCase {
    OrderResult create(CreateOrderCommand command);
}
```

Outbound ports describe external capabilities:

```java
public interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

## Adapters

An adapter connects a port to a real technology.

Inbound adapters call the application:

```java
@RestController
class OrderController {
    private final CreateOrderUseCase createOrder;
}
```

Outbound adapters implement external details:

```java
@Component
class StripePaymentAdapter implements PaymentGateway {
    public PaymentResult charge(PaymentCommand command) {
        // Stripe SDK details.
    }
}
```

## Why RICA Cares

Many violations happen when adapters leak inward. Examples include services importing SDK models, domain code importing JPA infrastructure, or controllers directly owning outbound HTTP calls.

## Related RICA Rules

- [`RICA-V301`](../violations/RICA-V301.md): missing adapter for vendor SDKs
- [`RICA-V307`](../violations/RICA-V307.md): missing abstraction across a boundary
- [`RICA-V320`](../violations/RICA-V320.md): service locator instead of explicit ports
- [`RICA-V322`](../violations/RICA-V322.md): missing proxy/wrapper for heavy resources
- [`RICA-V501`](../violations/RICA-V501.md): package boundary violation

## Practical Fix Rule

Application code defines what it needs. Adapters decide how the technology performs it.

