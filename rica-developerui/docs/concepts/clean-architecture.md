# Clean Architecture

Clean Architecture separates business policy from technical mechanisms. The most important idea is dependency direction: source-code dependencies should point inward toward stable business concepts, not outward toward frameworks and tools.

## Inner And Outer Code

Inner code contains business meaning:

- domain entities
- value objects
- use cases
- ports/interfaces that describe what the business needs

Outer code contains mechanisms:

- Spring MVC
- Spring Data JPA
- HTTP clients
- SDK clients
- databases
- files
- message brokers

## Dependency Direction

The application can say, "I need to charge a payment." It should not need to know whether payment is performed by Stripe, PayPal, a mock gateway, or a local simulator.

```java
public interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

Infrastructure implements that contract:

```java
@Component
class StripePaymentGateway implements PaymentGateway {
    public PaymentResult charge(PaymentCommand command) {
        // Stripe SDK details stay here.
    }
}
```

The service depends on the interface:

```java
@Service
class CheckoutService {
    private final PaymentGateway paymentGateway;

    CheckoutService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
}
```

## Why This Matters

Frameworks change. SDKs change. Databases change. Business policy should survive those changes with minimal edits.

RICA flags outward dependencies because they make the core code depend on details that should be replaceable.

## Common Mistakes

- Importing SDK request/response classes into services.
- Calling `ApplicationContext.getBean()` from business code.
- Putting Spring MVC annotations into application services.
- Letting package imports point from inner code to outer implementation packages.

## Practical Fix Rule

Move details outward. Keep contracts inward.

