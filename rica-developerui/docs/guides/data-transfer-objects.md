# Data Transfer Objects

API resources must expose DTOs, not internal domain objects. RICA–V201 through V204 enforce this at the API boundary.

## Rules

| Rule | What it catches |
| --- | --- |
| `RICA-V201` Exposing internal entity | endpoint returns or leaks an internal entity/domain object |
| `RICA-V202` Missing DTO usage | endpoint takes an internal domain/entity parameter rather than a DTO |
| `RICA-V203` Exposing internal structure | endpoint returns a non-DTO domain object |
| `RICA-V204` Business logic in resource | API resource method carries scoring/computation better suited to a service |
| `RICA-V206` Trivial passthrough | resource just forwards without any orchestration/auth concern |
| `RICA-V207` Unverified identity | mutating endpoint does not confirm the acting principal |

## DTO shape

A DTO class is recognized by its name (`...DTO`, `...Request`, `...Response`, `...Command`, `...Query`) and by packages such as `**/dto/**`, `**/api/**`. Internal domain types are resolved through the class map and entity-name patterns, so unparsed/third-party types are not falsely flagged.

## Good pattern

```java
@RestController
public class OrderApi {
    @PostMapping("/orders")
    public CreateOrderResponse create(@RequestBody CreateOrderRequest request) { // DTO in, DTO out
        CreateOrderCommand cmd = new CreateOrderCommand(request);                // then orchestrate
        return orderService.create(cmd);
    }
}
```

## Related rules

`[RICA-V201](./../violations/RICA-V201.md)`, `[RICA-V202](./../violations/RICA-V202.md)`, `[RICA-V203](./../violations/RICA-V203.md)`, `[RICA-V207](./../violations/RICA-V207.md)`.