# Transaction Boundaries

A transaction boundary defines which operations succeed or fail together.

In Spring applications, transaction boundaries are often declared with `@Transactional`.

## Common Placement

Transactions usually belong around service/use-case methods:

```java
@Service
class TransferService {
    @Transactional
    void transfer(TransferCommand command) {
        accountRepository.withdraw(command.from(), command.amount());
        accountRepository.deposit(command.to(), command.amount());
    }
}
```

The service owns the use case, so it knows which writes belong together.

## Risky Placement

Avoid placing transaction policy in controllers:

```java
@PostMapping("/transfer")
@Transactional
void transfer(@RequestBody TransferRequest request) {
    // HTTP and transaction policy are mixed.
}
```

Avoid hiding multi-step writes inside scattered helper methods with no clear boundary.

## Why RICA Cares

Multi-step write workflows become risky when the transaction boundary is unclear. Retry, rollback, audit, and error handling become tangled with ordinary service code.

## Related RICA Rules

- `RICA-V310`: missing command/use-case boundary for multi-step writes
- `RICA-V106`, `RICA-V204`: business workflow in the wrong layer
- `RICA-V114`: persistence details outside repositories

## Practical Fix Rule

Put transaction boundaries where the use case is coordinated, usually the service/application layer.

