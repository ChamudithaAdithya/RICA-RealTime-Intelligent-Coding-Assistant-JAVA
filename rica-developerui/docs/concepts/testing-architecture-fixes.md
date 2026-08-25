# Testing Architecture Fixes

Architecture refactors should preserve behavior. After fixing a RICA violation, run tests that match the responsibility you moved.

## Testing Matrix

| Fix type | Common RICA rules | Recommended test | What the test should prove |
| --- | --- | --- | --- |
| Move business logic to service | [`RICA-V106`](../violations/RICA-V106.md), [`RICA-V204`](../violations/RICA-V204.md) | Service unit test | The extracted business rule still returns the same result without HTTP setup. |
| Create request/response DTO | [`RICA-V201`](../violations/RICA-V201.md), [`RICA-V202`](../violations/RICA-V202.md), [`RICA-V207`](../violations/RICA-V207.md) | Controller/web-slice test | Public JSON shape is correct and internal fields do not leak. |
| Add validation | [`RICA-V206`](../violations/RICA-V206.md) | Controller/web-slice test | Invalid input is rejected before it reaches the service. |
| Move SQL/query to repository | [`RICA-V109`](../violations/RICA-V109.md), [`RICA-V114`](../violations/RICA-V114.md), [`RICA-V501`](../violations/RICA-V501.md) | Repository test | Query returns the expected rows and service no longer owns persistence details. |
| Introduce gateway/adapter | [`RICA-V110`](../violations/RICA-V110.md), [`RICA-V301`](../violations/RICA-V301.md), [`RICA-V322`](../violations/RICA-V322.md) | Adapter test plus service unit test | SDK/protocol mapping works at the edge, and service logic can use a fake gateway. |
| Add dependency injection | [`RICA-V101`](../violations/RICA-V101.md), [`RICA-V102`](../violations/RICA-V102.md), [`RICA-V103`](../violations/RICA-V103.md), [`RICA-V205`](../violations/RICA-V205.md), [`RICA-V320`](../violations/RICA-V320.md) | Unit test or Spring context test | Dependencies are supplied externally and the class can be tested with fakes. |
| Replace branches with Strategy/State | [`RICA-V303`](../violations/RICA-V303.md), [`RICA-V316`](../violations/RICA-V316.md) | Focused unit tests per implementation | Each behavior variation is correct and selection logic chooses the right implementation. |
| Add Command/use-case boundary | [`RICA-V310`](../violations/RICA-V310.md) | Service/use-case test with rollback case | The full write workflow succeeds or fails as one intentional unit. |
| Split interface/facade | [`RICA-V302`](../violations/RICA-V302.md), [`RICA-V309`](../violations/RICA-V309.md) | Existing caller tests | Callers still receive the behavior they used, but depend on smaller contracts. |
| Fix package/dependency graph | [`RICA-V401`](../violations/RICA-V401.md), [`RICA-V402`](../violations/RICA-V402.md), [`RICA-V403`](../violations/RICA-V403.md), [`RICA-V501`](../violations/RICA-V501.md) | Architecture scan plus affected unit tests | Dependency direction is restored and behavior remains unchanged. |

## Controller Fixes

Run controller or web-slice tests when you change request DTOs, response DTOs, validation annotations, HTTP status mapping, or controller delegation.

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
}
```

## Service Fixes

Run unit tests when you move business logic into services. Mock or fake repositories and gateways.

```java
OrderService service = new OrderService(fakeRepository, fakePaymentGateway);
```

## Repository Fixes

Run repository tests when you move SQL or `@Query` code.

```java
@DataJpaTest
class OrderRepositoryTest {
}
```

## Gateway Or Adapter Fixes

Run adapter tests when you move HTTP/SDK code behind a gateway. Prefer fake servers, contract tests, or SDK test clients instead of calling real production services.

## Design Pattern Fixes

Run focused unit tests for each new Strategy, State, Command, Factory, Adapter, Proxy, or event subscriber. The goal is to prove behavior stayed the same while structure improved.

## Practical Fix Rule

After moving code, test the behavior at the old public boundary and the new unit boundary.

