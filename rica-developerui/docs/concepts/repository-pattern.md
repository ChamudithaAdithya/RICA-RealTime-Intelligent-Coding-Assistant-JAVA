# Repository Pattern

The Repository pattern hides persistence details behind collection-like methods that describe business intent.

## What Belongs In A Repository

Repositories may contain:

- Spring Data query methods
- `@Query`, `@Modifying`, and `@Param`
- JPA `EntityManager` access
- JDBC queries
- persistence mapping details
- database-specific optimization

## What Does Not Belong There

Repositories should not contain:

- HTTP endpoint code
- request/response DTO shaping
- business workflow orchestration
- calls to controllers
- notification or payment workflow logic

## Example

```java
interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    @Query("select o from OrderEntity o where o.customerId = :customerId")
    List<OrderEntity> findForCustomer(@Param("customerId") long customerId);
}
```

The service calls a named method:

```java
class OrderService {
    private final OrderRepository orders;

    List<Order> findCustomerOrders(long customerId) {
        return orders.findForCustomer(customerId).stream()
            .map(OrderMapper::toDomain)
            .toList();
    }
}
```

## Related RICA Rules

- [`RICA-V102`](../violations/RICA-V102.md): repository used without injection
- [`RICA-V114`](../violations/RICA-V114.md): raw SQL outside the repository boundary
- [`RICA-V401`](../violations/RICA-V401.md), [`RICA-V402`](../violations/RICA-V402.md): graph-level repository access problems
- [`RICA-V501`](../violations/RICA-V501.md): wrong package/framework import direction

## Practical Fix Rule

If code is about how data is stored or queried, put it in a repository. If code is about why the business needs the data, put it in a service.

