# Framework Coupling

Framework coupling happens when code depends directly on framework types that do not belong in that layer.

Spring, JPA, servlet APIs, validation APIs, SDKs, and HTTP clients are useful, but their imports carry architectural meaning.

## Examples

Controller code may use Spring MVC:

```java
@RestController
class OrderController {
    @GetMapping("/orders/{id}")
    OrderResponse get(@PathVariable long id) {
        return OrderResponse.from(orderService.get(id));
    }
}
```

Repository code may use Spring Data:

```java
interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    @Query("select o from OrderEntity o where o.status = :status")
    List<OrderEntity> findByStatus(@Param("status") String status);
}
```

Application services should usually avoid both HTTP annotations and query annotations.

## Why RICA Cares

Wrong-layer framework imports make code harder to reuse and test. A service that imports `HttpServletRequest` is no longer a plain application service. A controller that imports `EntityManager` is no longer just an HTTP adapter.

## Related RICA Rules

- `RICA-V110`: outbound HTTP framework/client use in controllers
- `RICA-V114`: database framework use outside repository/infrastructure
- `RICA-V301`: vendor SDK leakage
- `RICA-V501`: package and framework boundary violations

## Practical Fix Rule

Framework types are allowed at the boundary that owns them. Move the import to the owning layer or wrap it behind a local interface.

