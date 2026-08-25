# RICA-V203 - Improper Error Handling

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 - Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V201`](./RICA-V201.md), [`RICA-V206`](./RICA-V206.md) |
| Source | `src/apiResourceLayerDetector.ts:280` |

## Trigger

An endpoint throws or declares a raw generic exception (`throws Exception`, `throw new Exception(...)`), or calls `printStackTrace()`. Private helper methods are skipped.

### Violating example

```
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable long id) throws Exception {
        User u = userService.findById(id);
        if (u == null) throw new Exception("user missing");
        return u;
    }
}
```


### Fixed version

```
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public UserResponse getUser(@PathVariable long id) {
        return userService.getUserResponse(id); // throws UserNotFoundException
    }

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse notFound(UserNotFoundException e) {
        return new ErrorResponse(404, e.getMessage());
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class UserController {
      @GetMapping("/users/{id}")
-     public User getUser(@PathVariable long id) throws Exception {
-         User u = userService.findById(id);
-         if (u == null) throw new Exception("user missing");
-         return u;
+     public UserResponse getUser(@PathVariable long id) {
+         return userService.getUserResponse(id); // throws UserNotFoundException
      }
+
+     @ExceptionHandler(UserNotFoundException.class)
+     @ResponseStatus(HttpStatus.NOT_FOUND)
+     public ErrorResponse notFound(UserNotFoundException e) {
+         return new ErrorResponse(404, e.getMessage());
+     }
  }
```


## Why it matters

A bare `Exception` surfacing from an endpoint becomes an opaque 500 to the client - no status code, no actionable message - and stack traces (`printStackTrace`) leak implementation details. Errors should be translated at the API boundary into meaningful HTTP responses.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [API boundary design](../concepts/api-boundary-design.md) - Learn request/response contracts, versioning, sensitive data leaks, and client-facing stability.
- [Validation and error boundaries](../concepts/validation-and-error-boundaries.md) - Learn where validation, exception mapping, and HTTP error shape should live.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Entities, DTOs, and API contracts](../concepts/entities-dtos-api-contracts.md) - Understand why entities are internal models and DTOs are stable request/response contracts.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Creational patterns](../concepts/creational-patterns.md) - Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.

## Common framework cases

### Endpoint throws broad exceptions

**When you see this:** A controller/resource method declares or throws `Exception`, `RuntimeException`, or returns raw error strings.

**Do this:**

1. Throw domain-specific exceptions from the service.
2. Map them in `@ControllerAdvice`/exception handlers.
3. Return stable error DTOs with the right HTTP status.

**Avoid:** Do not catch everything in the endpoint and return `500` for all failures.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Catch domain exceptions at the boundary and map them to HTTP status codes via `@ExceptionHandler` or `ResponseStatusException`.**
   This encapsulates protocol or vendor details in an infrastructure adapter, keeping application code focused on business intent.
2. **Define typed exceptions (NotFound, Conflict, etc.) in the service layer.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **Remove `printStackTrace()` calls.**
   This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V203 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Add proper error handling (try-catch or exception declarations) to API methods

## Tags

`error-handling` `api` `exceptions`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
