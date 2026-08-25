# Dependency Graphs And Cycles

A dependency graph shows which files, packages, or classes depend on each other.

If `OrderController` imports `OrderService`, then there is an edge:

```text
OrderController -> OrderService
```

## Cycles

A cycle means code eventually depends back on itself:

```text
OrderService -> PaymentService -> OrderService
```

Cycles make change risky because each class can affect the other. They also make testing, extraction, and package ownership harder.

## Fan-In And Fan-Out

Fan-in means many classes depend on a class. High fan-in code should be stable.

Fan-out means a class depends on many classes. High fan-out code often has too many responsibilities.

## Inverted Dependencies

An inverted dependency points against the architecture direction.

```text
domain -> infrastructure
service -> controller
repository -> controller
```

These imports usually reveal boundary leaks.

## Related RICA Rules

- `RICA-V401`: controller bypass
- `RICA-V402`: cross-layer violation
- `RICA-V403`: cyclic or inverted dependency
- `RICA-V404`: entity exposure
- `RICA-V501`: package boundary violation

## Practical Fix Rule

If a graph edge points the wrong way, do not just move imports around. Find the responsibility that crossed the boundary and move it to the owning layer.

