# Controllers, Services, And Repositories

These three layers are the most common source of Java architecture violations.

## Controller

A controller handles inbound HTTP.

It should:

- receive path, query, and body parameters
- validate request DTOs
- call a service
- convert the result to an HTTP response

It should not:

- run complex business decisions
- execute SQL
- call external APIs directly
- return persistence entities as public API responses

## Service

A service runs a use case or business workflow.

It should:

- coordinate repositories, domain objects, and gateways
- apply business rules
- manage transaction boundaries when the project uses service-level transactions
- return domain results or response-ready DTOs

It should not:

- know servlet APIs
- build HTTP responses
- contain raw SQL
- depend directly on external SDK models

## Repository

A repository hides persistence access.

It should:

- load and save aggregate/domain data
- own query annotations such as `@Query`, `@Modifying`, and `@Param`
- translate persistence-specific details into domain/application results

It should not:

- contain HTTP endpoint logic
- call controllers
- implement business workflows that belong in services

## Example Flow

```java
@RestController
class OrderController {
    private final OrderService service;

    @PostMapping("/orders")
    OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        return OrderResponse.from(service.createOrder(request.toCommand()));
    }
}
```

```java
@Service
class OrderService {
    private final OrderRepository repository;

    Order createOrder(CreateOrderCommand command) {
        Order order = Order.create(command);
        return repository.save(order);
    }
}
```

```java
interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("select o from Order o where o.customerId = :customerId")
    List<Order> findForCustomer(@Param("customerId") long customerId);
}
```

## Practical Fix Rule

Controller speaks HTTP. Service speaks use case. Repository speaks persistence.

