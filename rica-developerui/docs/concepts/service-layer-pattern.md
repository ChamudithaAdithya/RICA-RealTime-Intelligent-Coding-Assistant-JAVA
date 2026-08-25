# Service Layer Pattern

The Service Layer pattern groups business use cases into application services.

A service coordinates domain objects, repositories, gateways, transactions, and policies to complete a workflow.

## What Belongs In A Service

Services may contain:

- use-case orchestration
- business decisions
- calls to repositories
- calls to gateways or ports
- transaction boundaries
- coordination between multiple domain objects

## What Does Not Belong In A Service

Services should avoid:

- Spring MVC request mapping annotations
- `HttpServletRequest` or `ResponseEntity`
- raw SQL strings
- SDK-specific request/response classes
- file, socket, or connection lifecycle management

## Example

```java
@Service
class CheckoutService {
    private final OrderRepository orders;
    private final PaymentGateway payments;

    @Transactional
    Receipt checkout(CheckoutCommand command) {
        Order order = orders.getRequired(command.orderId());
        PaymentResult result = payments.charge(order.toPaymentCommand());
        order.markPaid(result.reference());
        return Receipt.from(orders.save(order));
    }
}
```

## Related RICA Rules

- [`RICA-V106`](../violations/RICA-V106.md), [`RICA-V204`](../violations/RICA-V204.md): business logic placed outside the service/application layer
- [`RICA-V110`](../violations/RICA-V110.md): controller directly performs outbound infrastructure calls
- [`RICA-V205`](../violations/RICA-V205.md): direct service instantiation
- [`RICA-V310`](../violations/RICA-V310.md): multi-step write workflow should become a command/use-case boundary

## Practical Fix Rule

If it describes an application use case, it probably belongs in a service.

