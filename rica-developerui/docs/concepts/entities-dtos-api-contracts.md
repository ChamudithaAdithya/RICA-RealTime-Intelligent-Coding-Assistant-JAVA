# Entities, DTOs, And API Contracts

An entity is an internal model. A DTO is a data shape used to cross a boundary, such as an HTTP request or response.

## Entity

Entities usually contain persistence or domain concerns:

```java
@Entity
class User {
    @Id
    private Long id;
    private String email;
    private String passwordHash;
    private boolean deleted;
}
```

This class is not a safe public API response because it contains internal fields and persistence annotations.

## DTO

A response DTO exposes only the contract clients should see:

```java
record UserResponse(Long id, String email) {
    static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail());
    }
}
```

A request DTO accepts only allowed input:

```java
record CreateUserRequest(
    @NotBlank String email,
    @Size(min = 8) String password
) {}
```

## Why RICA Cares

If endpoints return or accept entities directly, the public API becomes coupled to internal persistence structure. Changing a database field can break clients. Sensitive fields can leak. Lazy relationships can cause serialization problems.

## Common Mistakes

- Returning `List<Order>` directly from a controller.
- Accepting `@RequestBody User user` in a create endpoint.
- Adding JSON annotations to entities instead of creating DTOs.
- Letting API clients control fields such as `id`, `role`, `createdAt`, or `deleted`.

## Practical Fix Rule

Use request DTOs for inbound JSON and response DTOs for outbound JSON. Keep entities internal.

