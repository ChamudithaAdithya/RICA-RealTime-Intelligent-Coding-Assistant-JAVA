# Validation And Error Boundaries

Validation and error mapping protect the boundary between external input and internal business logic.

## Request Validation

Validate incoming DTOs at the controller/resource boundary:

```java
@PostMapping("/users")
UserResponse create(@Valid @RequestBody CreateUserRequest request) {
    return UserResponse.from(userService.create(request.toCommand()));
}
```

```java
record CreateUserRequest(
    @NotBlank String email,
    @Size(min = 8) String password
) {}
```

## Error Mapping

Business code should throw meaningful exceptions. HTTP mapping should happen at the edge:

```java
class DuplicateEmailException extends RuntimeException {
    DuplicateEmailException(String email) {
        super("Email already exists: " + email);
    }
}
```

```java
@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(DuplicateEmailException.class)
    ResponseEntity<ApiError> duplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(409).body(new ApiError("duplicate_email", ex.getMessage()));
    }
}
```

## Why RICA Cares

Without validation, invalid data reaches services and repositories. Without explicit error mapping, controllers often throw broad exceptions or return inconsistent responses.

## Common Mistakes

- Adding `@Valid` but no constraints inside the DTO.
- Catching `Exception` in every endpoint.
- Returning raw strings for errors.
- Throwing HTTP-specific exceptions deep inside domain code.

## Practical Fix Rule

Validate at the inbound boundary. Translate exceptions at the outbound boundary. Keep business code focused on business meaning.

