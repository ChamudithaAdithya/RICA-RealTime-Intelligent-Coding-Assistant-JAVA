# Behavioral Patterns

Behavioral patterns organize how behavior varies and how objects communicate.

They are useful when methods become full of conditionals, flags, duplicated branches, or state-specific behavior.

## Strategy

Strategy moves interchangeable behavior into separate classes.

```java
interface DiscountPolicy {
    Money apply(Order order);
}
```

```java
class SeasonalDiscountPolicy implements DiscountPolicy {
    public Money apply(Order order) {
        return order.total().multiply(0.9);
    }
}
```

Use Strategy when a method chooses between multiple algorithms.

## State

State moves behavior that depends on object state into state-specific classes.

Example: an order may behave differently when it is `Draft`, `Paid`, `Shipped`, or `Cancelled`.

Use State when conditionals repeatedly check the same status field.

## Observer

Observer lets one part of the system react to events without the publisher knowing every subscriber.

```java
record OrderCreatedEvent(long orderId) {}
```

Use Observer/eventing when side effects should be decoupled from the main workflow.

## Command

Command represents an action as an object.

It is useful for queues, retries, undo, scheduling, or command handlers.

## Template Method

Template Method puts shared algorithm structure in a base class and lets subclasses customize steps.

Use it carefully. In many Java applications, composition with Strategy is easier to test than deep inheritance.

## Why RICA Cares

Behavioral violations often appear as large conditionals, duplicated workflow branches, pattern misuse, or behavior placed in the wrong layer.

## Practical Fix Rule

When a method grows because behavior varies, name the variation and move it behind a small interface.

