# False Positives And Rule Tuning

A false positive is a reported violation that is not actually a design problem in the current project.

False positives do not mean the analyzer is useless. They mean the project has context that the rule did not fully understand.

## How To Decide

Ask these questions:

1. Is the code in the layer RICA thinks it is in?
2. Is the imported type actually owned by another layer?
3. Is this a production class or a test/support fixture?
4. Is the framework import valid in this package?
5. Would moving the code improve testability or reduce coupling?

## Real Violation

```java
@Service
class OrderService {
    @Query("select o from Order o")
    List<Order> findAllOrders();
}
```

The service owns a repository concern. Move it to a repository.

## Possible Configuration Issue

```java
package com.example.orders.repository;

interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("select o from Order o")
    List<Order> findAllOrders();
}
```

If this is reported as a boundary violation, the repository package or allowed framework imports may need tuning.

## Related RICA Rules

- [`RICA-V501`](../violations/RICA-V501.md): package boundary configuration
- [`RICA-V106`](../violations/RICA-V106.md), [`RICA-V204`](../violations/RICA-V204.md): threshold-based business logic detection
- [`RICA-V303`](../violations/RICA-V303.md) to [`RICA-V323`](../violations/RICA-V323.md): design-pattern heuristics

## Practical Fix Rule

Fix code when the responsibility is wrong. Tune configuration when the project structure is valid but the analyzer classification is too broad.

