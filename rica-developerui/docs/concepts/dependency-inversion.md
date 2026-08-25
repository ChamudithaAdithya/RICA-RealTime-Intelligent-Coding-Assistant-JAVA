# Dependency Inversion

Dependency inversion means high-level business code should depend on stable abstractions, not low-level implementation details.

It does not mean "use interfaces everywhere." It means use an interface when the caller needs a role, not a specific implementation.

## The Problem

This service is tied to one payment provider:

```java
@Service
class CheckoutService {
    private final StripeClient stripeClient;

    CheckoutService(StripeClient stripeClient) {
        this.stripeClient = stripeClient;
    }
}
```

If the provider changes, the business service changes.

## The Fix

Define what the service needs:

```java
public interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

Use the abstraction in the service:

```java
@Service
class CheckoutService {
    private final PaymentGateway paymentGateway;

    CheckoutService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
}
```

Implement it at the edge:

```java
@Component
class StripePaymentGateway implements PaymentGateway {
    public PaymentResult charge(PaymentCommand command) {
        // Stripe-specific code.
    }
}
```

## Why RICA Cares

Many architecture violations are really dependency inversion violations. A controller depending on a repository, a service depending on an SDK model, or a domain type depending on a framework annotation all point in the wrong direction.

## When Not To Add An Interface

Do not create an interface just because a class exists. Add one when:

- the implementation is external or replaceable
- tests need a simple fake
- multiple implementations are likely
- the dependency crosses an architectural boundary

## Practical Fix Rule

If the dependency is a technical detail, hide it behind a local interface that describes business intent.

