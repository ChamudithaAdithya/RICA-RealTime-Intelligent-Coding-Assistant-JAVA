# Layered Architecture

Layered architecture organizes code by responsibility. Each layer has a job, and each job should be easy to describe in one sentence.

## The Common Java Layers

| Layer | Main responsibility | Typical Spring/Java types |
| --- | --- | --- |
| Controller / resource | Handle inbound HTTP, parse input, call application code, shape HTTP response | `@RestController`, `@Controller`, `@RequestMapping`, `ResponseEntity` |
| Service / application | Run business workflows and use cases | `@Service`, use-case classes, command handlers |
| Domain / entity | Represent business concepts and protect business invariants | entities, value objects, domain services |
| Repository / persistence | Load and save data | Spring Data repositories, DAOs, `JdbcTemplate`, `EntityManager` |
| Infrastructure | Talk to external systems and technical mechanisms | HTTP clients, SDK clients, file storage, queues, database drivers |

## Why RICA Cares

When code is placed in the wrong layer, small changes become expensive. For example, if a controller calculates discounts, testing the discount rule may require HTTP setup. If a service imports servlet classes, that service cannot be reused from a CLI job, scheduler, or message consumer.

RICA flags these cases because they usually mean a class has more than one reason to change.

## Example

Bad: the controller owns business calculation.

```java
@PostMapping("/orders/total")
public double total(@RequestBody Order order) {
    double total = 0;
    for (Item item : order.getItems()) {
        total += item.getPrice() * item.getQty();
    }
    return total;
}
```

Better: the controller delegates the use case.

```java
@PostMapping("/orders/total")
public OrderTotalResponse total(@Valid @RequestBody OrderTotalRequest request) {
    Money total = orderService.calculateTotal(request.toCommand());
    return OrderTotalResponse.from(total);
}
```

## Common Mistakes

- Putting SQL, HTTP client calls, or file access inside a controller.
- Returning persistence entities directly from endpoints.
- Adding business workflows to entities that should only protect local invariants.
- Letting services depend on `HttpServletRequest`, `ResponseEntity`, or Spring MVC annotations.

## Practical Fix Rule

If the code knows about HTTP, it probably belongs near the controller. If it knows about business decisions, it probably belongs in a service or domain type. If it knows about database or external protocols, it belongs in repository or infrastructure code.

