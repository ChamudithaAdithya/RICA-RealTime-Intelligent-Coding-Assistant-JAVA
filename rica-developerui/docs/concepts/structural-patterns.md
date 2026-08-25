# Structural Patterns

Structural patterns organize how objects connect, wrap, or expose each other.

They are often useful at architecture boundaries because boundaries are where incompatible shapes meet.

## Adapter

Adapter converts one interface into another.

```java
class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient client;

    public PaymentResult charge(PaymentCommand command) {
        StripeRequest request = map(command);
        StripeResponse response = client.charge(request);
        return map(response);
    }
}
```

Use Adapter when application code should not depend on SDK classes.

## Facade

Facade gives a simpler interface over a complicated subsystem.

```java
class ReportingFacade {
    Report generateMonthlyReport(Month month) {
        // Coordinates queries, formatting, storage, and notification.
    }
}
```

Use Facade when callers should not know the many internal steps.

## Proxy

Proxy controls access to another object.

Examples include lazy loading, caching, security checks, rate limiting, and remote access.

## Decorator

Decorator adds behavior around another object with the same interface.

```java
class AuditingPaymentGateway implements PaymentGateway {
    private final PaymentGateway delegate;

    public PaymentResult charge(PaymentCommand command) {
        audit(command);
        return delegate.charge(command);
    }
}
```

## Composite

Composite treats individual objects and groups uniformly.

It is useful for trees such as menus, file structures, rule groups, or UI components.

## Why RICA Cares

Structural pattern problems often show up as SDK leakage, missing adapters, bloated facades, proxy misuse, or confusing wrapper classes.

## Practical Fix Rule

Use structural patterns to simplify dependencies at boundaries, not to hide unclear ownership.

