# Package Boundaries

Java imports reveal architecture. If a file imports a class from the wrong package, the code probably depends on the wrong layer.

## Why Packages Matter

Packages are not only folders. They describe ownership:

```text
com.example.orders.api
com.example.orders.application
com.example.orders.domain
com.example.orders.infrastructure
```

Each package should have clear allowed dependencies.

## Good Direction

```text
api -> application -> domain
infrastructure -> application/domain contracts
```

The API layer can call the application layer. Infrastructure can implement application ports.

## Risky Direction

```text
domain -> infrastructure
application -> api
repository -> controller
```

These imports usually mean an inner or lower-level layer knows about an outer mechanism.

## Framework Imports

Some framework imports are only valid in certain layers.

Examples:

- `@GetMapping` belongs in controllers/resources.
- `@Query`, `@Modifying`, and `@Param` belong in repositories.
- HTTP client and SDK classes belong in infrastructure/adapters.
- JPA annotations normally belong in persistence entities or persistence models.

## Why RICA Cares

Forbidden imports create hidden architecture dependencies. They make code harder to move, test, and reuse.

## Practical Fix Rule

When a package imports the wrong thing, first ask whether the imported type belongs in that layer. If not, move the code to the correct layer or introduce an inward-facing interface/DTO.

