# Separation Of Concerns

Separation of concerns means each part of the codebase should focus on one kind of work.

In RICA, the most common concerns are:

- HTTP input/output
- business workflow
- domain rules
- persistence
- external communication
- validation
- error mapping
- resource lifecycle

## Why It Matters

When concerns are mixed, changes spread. A small API change can break business tests. A database change can affect controllers. A payment SDK update can force service refactoring.

## Example

Bad: one method mixes many concerns.

```java
@PostMapping("/pay")
ResponseEntity<String> pay(@RequestBody PaymentRequest request) {
    if (request.amount() <= 0) return ResponseEntity.badRequest().body("bad amount");
    String result = restTemplate.postForObject(paymentUrl, request, String.class);
    jdbcTemplate.update("insert into audit_log values (?)", result);
    return ResponseEntity.ok(result);
}
```

Better: separate the concerns.

```java
@PostMapping("/pay")
PaymentResponse pay(@Valid @RequestBody PaymentRequest request) {
    return PaymentResponse.from(paymentService.pay(request.toCommand()));
}
```

The service handles the workflow, the gateway handles payment infrastructure, the repository handles persistence, and exception handlers shape HTTP errors.

## Related RICA Rules

- [`RICA-V106`](../violations/RICA-V106.md): business logic in controllers/entities
- [`RICA-V110`](../violations/RICA-V110.md): direct HTTP calls in controllers
- [`RICA-V114`](../violations/RICA-V114.md): raw SQL in controllers
- [`RICA-V201`](../violations/RICA-V201.md), [`RICA-V202`](../violations/RICA-V202.md): entity/API boundary mixing
- [`RICA-V301`](../violations/RICA-V301.md), [`RICA-V501`](../violations/RICA-V501.md): infrastructure/package coupling

## Practical Fix Rule

When a method does two kinds of work, name those two concerns. Then move one concern behind a service, repository, DTO, gateway, or handler.

