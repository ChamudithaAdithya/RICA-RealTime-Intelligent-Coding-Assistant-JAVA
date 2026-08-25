# Creational Patterns

Creational patterns organize object construction.

They help when construction has rules, options, validation, or repeated setup that should not be copied everywhere.

## Factory

Use Factory when code must choose which implementation to create.

```java
interface NotificationSender {
    void send(Message message);
}
```

```java
class NotificationSenderFactory {
    NotificationSender forChannel(Channel channel) {
        return switch (channel) {
            case EMAIL -> new EmailSender();
            case SMS -> new SmsSender();
        };
    }
}
```

Avoid factories that only wrap one constructor with no useful policy.

## Builder

Use Builder when an object has many optional fields or construction needs readable steps.

```java
OrderQuery query = OrderQuery.builder()
    .customerId(customerId)
    .status(OrderStatus.PAID)
    .limit(50)
    .build();
```

Avoid Builder for tiny objects with one or two required values.

## Singleton

Singleton means one shared instance. In Spring applications, singleton lifecycle is usually handled by the container.

Prefer this:

```java
@Service
class CurrencyService {
}
```

Be careful with this:

```java
class CurrencyService {
    static final CurrencyService INSTANCE = new CurrencyService();
}
```

Static singletons can hide dependencies and shared mutable state.

## Prototype

Prototype creates new objects by copying a configured instance.

Use it when copying is clearer than rebuilding a complex object from scratch. Avoid it when normal constructors or builders are simpler.

## Why RICA Cares

Creational violations often appear as direct construction in the wrong layer, over-engineered factories, unsafe singletons, or repeated setup logic.

## Practical Fix Rule

Put construction policy in one place only when construction has real policy.

