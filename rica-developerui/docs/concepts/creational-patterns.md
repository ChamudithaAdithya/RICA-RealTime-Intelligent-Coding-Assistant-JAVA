# Creational Patterns

Creational patterns organize object construction.

They help when construction has **selection rules**, **many options**, **repeated setup**, **copy behavior**, or **shared lifecycle concerns** that should not be copied everywhere.

## Factory - [`RICA-V304`](../violations/RICA-V304.md)

Factory centralizes object creation when callers should depend on an abstraction instead of constructing concrete classes themselves.

RICA usually reports this when it sees the **same concrete implementation constructed from several callers**.

```java
interface NotificationSender {
    void send(Message message);
}

class NotificationSenderFactory {
    NotificationSender forChannel(Channel channel) {
        return switch (channel) {
            case EMAIL -> new EmailSender();
            case SMS -> new SmsSender();
        };
    }
}
```

Avoid factories that only wrap one constructor with no useful creation policy.

## Abstract Factory - [`RICA-V312`](../violations/RICA-V312.md)

Abstract Factory gives related factories a shared creation contract.

RICA usually reports this when it sees **multiple concrete factories** that create related products but share no common abstraction.

```java
interface UiFactory {
    Button button();
    Dialog dialog();
}

class WebUiFactory implements UiFactory {
    public Button button() { return new WebButton(); }
    public Dialog dialog() { return new WebDialog(); }
}
```

Use it when product families must stay consistent.

## Builder - [`RICA-V308`](../violations/RICA-V308.md)

Builder makes complex object assembly readable and keeps construction policy out of business workflows.

RICA usually reports this when it sees **construction-heavy business methods** with repeated setters, optional fields, or setup steps.

```java
OrderQuery query = OrderQuery.builder()
    .customerId(customerId)
    .status(OrderStatus.PAID)
    .limit(50)
    .build();
```

Avoid Builder for tiny objects with one or two required values.

## Singleton - [`RICA-V305`](../violations/RICA-V305.md)

Singleton means one shared instance. In Spring applications, singleton lifecycle is usually handled by the container.

RICA usually reports this when it sees **static mutable state**, such as shared maps, lists, sets, or builders.

Prefer this:

```java
@Service
class CurrencyService {
}
```

Be careful with this:

```java
class CurrencyService {
    static final Map<String, Rate> RATES = new HashMap<>();
}
```

Static mutable singletons can hide dependencies, leak state between tests, and create concurrency bugs.

## Prototype - [`RICA-V311`](../violations/RICA-V311.md)

Prototype creates a new object by copying an existing configured object.

RICA usually reports this when it sees **manual field-by-field copying** from one object to another.

```java
class OrderDraft {
    OrderDraft copy() {
        return new OrderDraft(customerId, items, shippingAddress);
    }
}
```

Use Prototype, copy constructors, or mapper methods when copying is clearer than rebuilding a complex object from scratch.

## Related RICA Rules

| Pattern | RICA rule | Violation name | Trigger signal |
| --- | --- | --- | --- |
| Factory | [`RICA-V304`](../violations/RICA-V304.md) | Factory Missing | Repeated concrete construction |
| Builder | [`RICA-V308`](../violations/RICA-V308.md) | Leaking Construction Logic | Complex construction in business code |
| Singleton | [`RICA-V305`](../violations/RICA-V305.md) | Mutable Singleton | Static mutable global state |
| Prototype | [`RICA-V311`](../violations/RICA-V311.md) | Missing Prototype | Manual field-by-field copying |
| Abstract Factory | [`RICA-V312`](../violations/RICA-V312.md) | Fragmented Factories | Concrete factories with no common contract |

## Practical Fix Rule

Put construction policy in one place only when construction has real policy.

