# Behavioral Patterns

Behavioral patterns organize how behavior varies, how workflow steps are represented, and how objects communicate.

RICA usually points to behavioral patterns when it sees **duplicated branches**, **state-specific behavior**, **multi-step workflows**, **hardcoded side effects**, or **long validation pipelines**.

## Strategy - [`RICA-V303`](../violations/RICA-V303.md)

Strategy moves interchangeable algorithms into separate classes behind a shared interface.

RICA usually reports this when it sees **four or more branches** checking the same discriminator, such as type, status, mode, role, or channel.

```java
interface DiscountPolicy {
    Money apply(Order order);
}

class VipDiscountPolicy implements DiscountPolicy {
    public Money apply(Order order) {
        return order.total().multiply(0.8);
    }
}
```

Fix direction: move each branch into a strategy implementation and choose the strategy from a map, factory, or injected collection.

## Command - [`RICA-V310`](../violations/RICA-V310.md)

Command represents a workflow action as a named object or use-case boundary.

RICA usually reports this when it sees **multi-step persistence writes** inside one method without a clear command/use-case or transaction boundary.

```java
record ApproveOrderCommand(long orderId, String reviewer) {}

class ApproveOrderHandler {
    @Transactional
    void handle(ApproveOrderCommand command) {
        Order order = orders.getRequired(command.orderId());
        order.approve(command.reviewer());
        orders.save(order);
    }
}
```

Fix direction: wrap the write sequence in a command handler or explicit use-case method, then place transaction/audit/retry policy at that boundary.

## State - [`RICA-V316`](../violations/RICA-V316.md)

State moves behavior that depends on object state into state-specific classes or a transition table.

RICA usually reports this when it sees **the same status or state checks scattered across multiple classes**.

```java
interface OrderState {
    void process(Order order);
}

class PaidState implements OrderState {
    public void process(Order order) {
        order.prepareShipment();
    }
}
```

Fix direction: centralize transition rules so callers delegate to state behavior instead of repeating `if (status == ...)` checks.

## Observer - [`RICA-V318`](../violations/RICA-V318.md)

Observer decouples the publisher of an event from the objects that react to it.

RICA usually reports this when it sees **one use case directly calling many notification, audit, event, or publisher targets**.

```java
record OrderCreatedEvent(long orderId) {}

class OrderCreatedListener {
    void on(OrderCreatedEvent event) {
        emailSender.sendOrderCreated(event.orderId());
    }
}
```

Fix direction: publish one domain/application event and move side effects into subscribers.

## Template Method - [`RICA-V317`](../violations/RICA-V317.md)

Template Method keeps a repeated algorithm skeleton in one place while allowing selected steps to vary.

RICA usually reports this when it sees **similar call sequences repeated across classes** with small differences in the middle.

```java
abstract class ImportJob {
    final void run() {
        read();
        validate();
        persist();
    }

    protected abstract void read();
    protected abstract void validate();
    protected abstract void persist();
}
```

Fix direction: extract the stable sequence and leave only real variation points as hooks or strategy collaborators.

## Chain Of Responsibility - [`RICA-V319`](../violations/RICA-V319.md)

Chain of Responsibility splits a long processing or validation pipeline into ordered handlers.

RICA usually reports this when it sees **many sequential guard, validation, or processing steps** in one method.

```java
interface OrderValidator {
    void validate(OrderDraft draft);
}

class StockValidator implements OrderValidator {
    public void validate(OrderDraft draft) {
        // stock checks
    }
}
```

Fix direction: compose focused handlers in the required order instead of keeping the whole pipeline inside one method.

## Null Object / Optional - [`RICA-V321`](../violations/RICA-V321.md)

Null Object and `Optional` model absence explicitly instead of spreading defensive null checks through code.

RICA usually reports this when it sees **many null checks across several target objects** in the same method.

```java
interface TaxPolicy {
    Money calculate(Order order);
}

class NoTaxPolicy implements TaxPolicy {
    public Money calculate(Order order) {
        return Money.zero();
    }
}
```

Fix direction: return empty collections, use `Optional` at boundaries, or provide harmless default implementations where absence is normal.

## Related RICA Rules

| Pattern | RICA rule | Violation name | Trigger signal | Fix direction |
| --- | --- | --- | --- | --- |
| Strategy | [`RICA-V303`](../violations/RICA-V303.md) | Strategy Missing | Repeated branch chain by discriminator | Move branches into strategy implementations |
| Command | [`RICA-V310`](../violations/RICA-V310.md) | Missing Command | Multi-step write workflow | Create command/use-case boundary |
| State | [`RICA-V316`](../violations/RICA-V316.md) | Scattered State Machine | State checks repeated across classes | Move transitions into state objects/table |
| Observer | [`RICA-V318`](../violations/RICA-V318.md) | Hardcoded Notifications | Many direct side-effect calls | Publish event and subscribe listeners |
| Template Method | [`RICA-V317`](../violations/RICA-V317.md) | Duplicate Algorithm | Repeated algorithm skeleton | Extract invariant sequence |
| Chain of Responsibility | [`RICA-V319`](../violations/RICA-V319.md) | Monolithic Pipeline | Long sequential validation/process chain | Split into ordered handlers |
| Null Object / Optional | [`RICA-V321`](../violations/RICA-V321.md) | Excessive Null Checks | Repeated null guards | Model absence explicitly |

## Practical Fix Rule

When a method grows because behavior varies, name the variation and move it behind a small interface or explicit workflow boundary.

