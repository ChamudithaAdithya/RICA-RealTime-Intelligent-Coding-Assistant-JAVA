# SOLID Principles

SOLID is a set of object-oriented design principles. RICA uses these ideas indirectly when it detects misplaced responsibilities, concrete coupling, bloated interfaces, and code that is hard to change safely.

## Single Responsibility Principle

A class should have one main reason to change.

Bad: one controller handles HTTP, pricing, persistence, and notification.

```java
@PostMapping("/orders")
OrderResponse create(@RequestBody OrderRequest request) {
    double total = calculateDiscount(request);
    orderRepository.save(toEntity(request, total));
    emailClient.sendConfirmation(request.email());
    return new OrderResponse(total);
}
```

Better: the controller delegates the use case.

```java
@PostMapping("/orders")
OrderResponse create(@Valid @RequestBody OrderRequest request) {
    return OrderResponse.from(orderService.createOrder(request.toCommand()));
}
```

## Open/Closed Principle

Code should be open for extension but closed for repeated modification. Large `if` or `switch` chains often violate this when every new case requires editing the same method.

Strategy, State, Factory, and Command are common fixes.

## Liskov Substitution Principle

Subtypes should be usable anywhere the base type is expected. A subtype that throws unsupported-operation exceptions or changes expected behavior may break this principle.

## Interface Segregation Principle

Clients should not depend on methods they do not use.

RICA design-pattern rules can flag fat interfaces where one interface forces unrelated responsibilities onto implementations.

## Dependency Inversion Principle

High-level policy should not depend on low-level details. Use interfaces or ports when crossing architectural boundaries.

```java
class CheckoutService {
    private final PaymentGateway paymentGateway;
}
```

## Related RICA Rules

- `RICA-V101`, `RICA-V102`, `RICA-V103`: dependency construction and injection problems
- `RICA-V106`, `RICA-V204`: responsibility in the wrong layer
- `RICA-V301`, `RICA-V307`, `RICA-V320`, `RICA-V501`: dependency direction and coupling problems
- `RICA-V309`: interface segregation problems

## Practical Fix Rule

When a class changes for unrelated reasons, split the responsibilities before adding more conditions, annotations, or dependencies.

