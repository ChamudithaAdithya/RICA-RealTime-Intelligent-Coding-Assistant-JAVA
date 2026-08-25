# Domain Model Vs Anemic Model

A domain model represents business concepts. The question is how much behavior should live inside those domain objects.

## Rich Domain Model

A rich domain model keeps important invariants close to the data.

```java
class Order {
    private OrderStatus status;

    void markPaid(PaymentResult payment) {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("Only pending orders can be paid");
        }
        status = OrderStatus.PAID;
    }
}
```

## Anemic Model

An anemic model has data but almost no behavior.

```java
class Order {
    OrderStatus status;
}
```

All behavior is pushed into services.

## Which Is Correct

Both styles can work. The problem is not "all entities need lots of methods." The problem is putting business behavior in random places where it becomes duplicated or hard to protect.

Entities should usually protect their own invariants. Services should orchestrate use cases across multiple objects and external dependencies.

## Related RICA Rules

- `RICA-V106`: entities/controllers with too much unrelated business logic
- `RICA-V108`: anemic entity
- `RICA-V204`: business logic in resource/API classes
- `RICA-V316`: scattered state machine logic

## Practical Fix Rule

Put invariant protection near the domain object. Put cross-object workflow in the service layer.

