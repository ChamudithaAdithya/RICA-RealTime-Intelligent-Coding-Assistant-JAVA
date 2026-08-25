# Structural Patterns

Structural patterns organize how objects connect, wrap, expose, or compose other objects.

RICA usually points to structural patterns when it sees **direct SDK coupling**, **oversized facades**, **cross-cutting code repeated inline**, **tree-like type checks**, **heavy resource access**, or **combinatorial inheritance**.

## Adapter - [`RICA-V301`](../violations/RICA-V301.md)

Adapter converts an external or incompatible interface into a local interface the application owns.

RICA usually reports this when it sees **domain/application code importing vendor SDK or external API types directly**.

```java
interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}

class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient client;

    public PaymentResult charge(PaymentCommand command) {
        StripeRequest request = map(command);
        StripeResponse response = client.charge(request);
        return map(response);
    }
}
```

Fix direction: define a local port/interface and implement it in infrastructure with the SDK-specific adapter.

## Facade - [`RICA-V302`](../violations/RICA-V302.md)

Facade provides a simpler interface over several subsystem operations.

RICA usually reports a problem when it sees a **god facade**: one facade with too many incoming dependencies, too many lines, and mostly trivial delegation.

```java
class ReportingFacade {
    Report generateMonthlyReport(Month month) {
        SalesData sales = salesReports.load(month);
        StockData stock = inventoryReports.load(month);
        return reportFormatter.format(sales, stock);
    }
}
```

Fix direction: keep facades cohesive. Split a god facade by business capability or subsystem.

## Decorator - [`RICA-V313`](../violations/RICA-V313.md)

Decorator wraps an object with extra behavior while preserving the same interface.

RICA usually reports this when it sees **logging, metrics, tracing, audit, or other cross-cutting behavior repeated inside business methods**.

```java
class AuditingPaymentGateway implements PaymentGateway {
    private final PaymentGateway delegate;

    public PaymentResult charge(PaymentCommand command) {
        audit(command);
        return delegate.charge(command);
    }
}
```

Fix direction: move repeated cross-cutting behavior into decorators or AOP advisors.

## Composite - [`RICA-V314`](../violations/RICA-V314.md)

Composite lets clients treat individual objects and groups through the same interface.

RICA usually reports this when it sees **loops with repeated `instanceof` checks** for leaf-like and container-like objects.

```java
interface MenuItem {
    void render();
}

class MenuGroup implements MenuItem {
    private final List<MenuItem> children;

    public void render() {
        children.forEach(MenuItem::render);
    }
}
```

Fix direction: expose a shared component interface and move type-specific behavior behind polymorphism.

## Flyweight - [`RICA-V315`](../violations/RICA-V315.md)

Flyweight shares immutable intrinsic state instead of repeatedly allocating the same small value objects.

RICA usually reports this when it sees **immutable value-like objects repeatedly allocated inside loops**.

```java
class CurrencyCatalog {
    static final Currency USD = Currency.getInstance("USD");
}
```

Fix direction: hoist invariant values out of loops or cache frequently reused immutable values.

## Proxy - [`RICA-V322`](../violations/RICA-V322.md)

Proxy controls access to a heavy resource or remote object.

RICA usually reports this when it sees **business code directly opening connections, sockets, HTTP clients, data sources, or entity managers**.

```java
interface ConnectionProxy {
    <T> T execute(SqlWork<T> work);
}

class PooledConnectionProxy implements ConnectionProxy {
    public <T> T execute(SqlWork<T> work) {
        // Acquire, monitor, secure, and release the connection here.
    }
}
```

Fix direction: access heavyweight resources through a managed wrapper, proxy, or injected infrastructure bean.

## Bridge - [`RICA-V323`](../violations/RICA-V323.md)

Bridge separates an abstraction from an implementation dimension so both can vary independently.

RICA usually reports this when it sees **class names that combine two independent dimensions**, such as `RedSquare`, `BlueSquare`, `RedCircle`, and `BlueCircle`.

```java
interface Color {
    void apply();
}

abstract class Shape {
    protected final Color color;

    protected Shape(Color color) {
        this.color = color;
    }
}

class Square extends Shape {
    Square(Color color) {
        super(color);
    }
}
```

Fix direction: replace combinatorial subclasses with composition between the two dimensions.

## Boundary Abstraction - [`RICA-V307`](../violations/RICA-V307.md)

Boundary abstraction is not a GoF structural pattern by itself, but it is the idea behind many structural fixes.

RICA usually reports this when it sees **code depending on a concrete implementation across an architectural boundary**, or when an abstraction exists but is not justified by real variation.

```java
interface InvoiceSender {
    void send(Invoice invoice);
}

class EmailInvoiceSender implements InvoiceSender {
    public void send(Invoice invoice) {
        // email implementation
    }
}
```

Fix direction: keep abstractions only when they reduce coupling, support replacement, or represent a real role.

## Related RICA Rules

| Pattern / concept | RICA rule | Violation name | Trigger signal | Fix direction |
| --- | --- | --- | --- | --- |
| Adapter | [`RICA-V301`](../violations/RICA-V301.md) | Adapter Missing | Vendor SDK leaks into core code | Wrap SDK with infrastructure adapter |
| Facade | [`RICA-V302`](../violations/RICA-V302.md) | God Facade | Oversized mostly-delegating facade | Split by cohesive responsibility |
| Boundary abstraction | [`RICA-V307`](../violations/RICA-V307.md) | Missing Abstraction | Concrete dependency crosses boundary | Introduce or remove abstraction intentionally |
| Decorator | [`RICA-V313`](../violations/RICA-V313.md) | Missing Decorator | Repeated cross-cutting calls | Wrap with decorator/AOP |
| Composite | [`RICA-V314`](../violations/RICA-V314.md) | Missing Composite | `instanceof` branches over tree-like objects | Use common component interface |
| Flyweight | [`RICA-V315`](../violations/RICA-V315.md) | Flyweight Missing | Repeated immutable allocations | Share/cache immutable state |
| Proxy | [`RICA-V322`](../violations/RICA-V322.md) | Missing Proxy | Direct heavy resource access | Use managed proxy/wrapper |
| Bridge | [`RICA-V323`](../violations/RICA-V323.md) | Missing Bridge | Combinatorial subclass hierarchy | Split dimensions with composition |

## Practical Fix Rule

Use structural patterns to simplify dependencies at boundaries, make ownership explicit, and remove repeated connection or type-checking logic.

