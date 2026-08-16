# Dependency Injection

RICA treats Spring's container as the only legitimate way to obtain collaborators inside application-layer code. Direct `new` on a repository/DAO/service concrete class, an unannotated field, or manual `ServiceLoader`/`Executors` usage are all violations.

## Rules

| Rule | What it catches |
| --- | --- |
| `RICA-V101` Self-instantiation | `new` construction of repositories, DAOs, concrete services or infrastructure inside a service/controller |
| `RICA-V102` Uninjected repository access | repository/DAO field with no injection annotation, or repository used through a non-injected reference |
| `RICA-V103` Uninjected service access | service used from a controller without injection |
| `RICA-V205` Service in DTOs | a service/repository type exposed inside a DTO graph (keeps DTOs plain) |

## Recommended shape

Prefer constructor injection so the dependency graph is explicit:

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

This satisfies the analyzer (constructor-injected repository is not flagged) and makes mocking trivial.

## What is accepted

- `@Autowired` / `@Inject` / `@Resource` field injection.
- Constructor injection, including Lombok `@AllArgsConstructor` and `@RequiredArgsConstructor`.
- Repository types resolved through the class map (`classMap`) so unparsed framework types are not falsely flagged.

## Related rules

Full details: `[RICA-V101](./../violations/RICA-V101.md)`, `[RICA-V102](./../violations/RICA-V102.md)`, `[RICA-V103](./../violations/RICA-V103.md)`, `[RICA-V205](./../violations/RICA-V205.md)`.