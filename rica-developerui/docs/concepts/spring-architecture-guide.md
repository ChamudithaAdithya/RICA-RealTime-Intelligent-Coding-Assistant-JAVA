# Spring Architecture Guide

This page explains where common Spring annotations and types usually belong in a RICA-friendly Java project.

## Controller Layer

Use:

- `@RestController`
- `@Controller`
- `@RequestMapping`
- `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`
- `@RequestBody`, `@PathVariable`, `@RequestParam`
- `ResponseEntity`

Avoid:

- raw SQL
- JPA `EntityManager`
- `JdbcTemplate`
- outbound `RestTemplate` or `WebClient` calls
- complex business workflows

## Service Layer

Use:

- `@Service`
- constructor injection
- use-case methods
- `@Transactional` when the service owns the write workflow

Avoid:

- Spring MVC annotations
- servlet types
- repository query annotations
- SDK-specific request/response models

## Repository Layer

Use:

- `@Repository`
- Spring Data repository interfaces
- `@Query`
- `@Modifying`
- `@Param`
- JPA/JDBC query details

Avoid:

- HTTP handling
- controller calls
- cross-use-case orchestration

## Validation And Errors

Use `@Valid` on request DTO parameters and constraints inside DTOs.

Use `@RestControllerAdvice` or exception handlers for HTTP error shape.

## Related RICA Rules

- [`RICA-V101`](../violations/RICA-V101.md) to [`RICA-V114`](../violations/RICA-V114.md): layer-specific Spring placement
- [`RICA-V201`](../violations/RICA-V201.md) to [`RICA-V207`](../violations/RICA-V207.md): API boundary rules
- [`RICA-V501`](../violations/RICA-V501.md): framework/package import boundaries

## Practical Fix Rule

Spring annotations are not automatically wrong. They are wrong when they appear in a layer that should not know that framework concern.

