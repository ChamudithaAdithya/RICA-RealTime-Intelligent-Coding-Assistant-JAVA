# Testing Architecture Fixes

Architecture refactors should preserve behavior. After fixing a RICA violation, run tests that match the layer you changed.

## Controller Fixes

Run controller or web-slice tests when you change:

- request DTOs
- response DTOs
- validation annotations
- HTTP status mapping
- controller delegation

Useful Spring style:

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
}
```

## Service Fixes

Run unit tests when you move business logic into services.

Mock or fake repositories and gateways:

```java
OrderService service = new OrderService(fakeRepository, fakePaymentGateway);
```

## Repository Fixes

Run repository tests when you move SQL or `@Query` code.

Useful Spring style:

```java
@DataJpaTest
class OrderRepositoryTest {
}
```

## Gateway Or Adapter Fixes

Run adapter tests when you move HTTP/SDK code behind a gateway.

Prefer fake servers, contract tests, or SDK test clients instead of calling real production services.

## Design Pattern Fixes

Run focused unit tests for each new Strategy, State, Command, Factory, or Adapter. The goal is to prove behavior stayed the same while structure improved.

## Related RICA Rules

All RICA rules benefit from tests. The most important cases are `RICA-V106`, `RICA-V110`, `RICA-V201`, `RICA-V202`, `RICA-V303`, `RICA-V310`, and `RICA-V501`.

## Practical Fix Rule

After moving code, test the behavior at the old public boundary and the new unit boundary.

