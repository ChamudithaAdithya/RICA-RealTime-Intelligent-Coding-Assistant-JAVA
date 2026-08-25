# API Boundary Design

An API boundary is the contract between your application and its clients.

In a Java web application, the boundary is usually made of request DTOs, response DTOs, validation rules, status codes, and error shapes.

## Stable Request Models

```java
record CreateUserRequest(
    @NotBlank String email,
    @Size(min = 8) String password
) {}
```

The request model should expose only fields the client is allowed to send.

## Stable Response Models

```java
record UserResponse(long id, String email) {
    static UserResponse from(User user) {
        return new UserResponse(user.id(), user.email());
    }
}
```

The response model should expose only fields the client is allowed to see.

## Why Not Return Entities

Entities often contain:

- persistence annotations
- internal IDs
- lazy relationships
- sensitive fields
- fields that should not be client-controlled
- implementation details that change with the database

## Related RICA Rules

- `RICA-V201`: endpoint exposes internal entity
- `RICA-V202`: endpoint accepts entity instead of DTO
- `RICA-V203`: improper error handling
- `RICA-V206`: missing validation
- `RICA-V207`: exposing internal structure

## Practical Fix Rule

Treat every endpoint as a public contract. Use DTOs even when the current entity shape looks convenient.

