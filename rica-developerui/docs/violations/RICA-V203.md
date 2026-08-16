# RICA-V203 — Improper Error Handling

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `APIResourceLayerAnalyzer` (APIResourceLayer) |
| Layer | api |
| Configuration | Not configurable (always on) |
| Related rules | [`RICA-V201`](./RICA-V201.md), [`RICA-V206`](./RICA-V206.md) |
| Source | `src/apiResourceLayerDetector.ts:280` |

## Trigger

An endpoint throws or declares a raw generic exception (`throws Exception`, `throw new Exception(...)`), or calls `printStackTrace()`. Private helper methods are skipped.

### Before (violates)

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


### After (fixed)

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


## Why it matters

A bare `Exception` surfacing from an endpoint becomes an opaque 500 to the client — no status code, no actionable message — and stack traces (`printStackTrace`) leak implementation details. Errors should be translated at the API boundary into meaningful HTTP responses.

## How to fix

1. Catch domain exceptions at the boundary and map them to HTTP status codes via `@ExceptionHandler` or `ResponseStatusException`.
2. Define typed exceptions (NotFound, Conflict, etc.) in the service layer.
3. Remove `printStackTrace()` calls.

## Mitigation hint

> Add proper error handling (try-catch or exception declarations) to API methods

## Tags

`error-handling` `api` `exceptions`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
