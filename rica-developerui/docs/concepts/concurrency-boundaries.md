# Concurrency And Resource Boundaries

Concurrency and heavyweight resources need clear ownership.

Threads, executors, sockets, database connections, HTTP clients, and file handles all have lifecycle rules. They can leak, block, race, or exhaust system resources when created casually inside business code.

## Bad: Service Creates Threads

```java
@Service
class InvoiceService {
    void sendInvoice(Invoice invoice) {
        new Thread(() -> emailClient.send(invoice)).start();
    }
}
```

The service now owns threading policy, error handling, and lifecycle.

## Better: Delegate Async Work

```java
@Service
class InvoiceService {
    private final InvoiceNotificationPort notifications;

    void sendInvoice(Invoice invoice) {
        notifications.sendInvoice(invoice.id());
    }
}
```

Infrastructure or framework configuration can decide whether this is synchronous, queued, retried, or async.

## Heavy Resources

Avoid creating these inside business methods:

- `Thread`
- `ExecutorService`
- `Socket`
- `Connection`
- `DataSource`
- `HttpClient`
- `EntityManager`

Prefer framework-managed beans, pools, adapters, or gateways.

## Why RICA Cares

Resource lifecycle bugs are hard to see from local code. RICA flags patterns that usually indicate unmanaged lifecycle or hidden infrastructure ownership.

## Practical Fix Rule

Business code may request work. Infrastructure code should own execution mechanics and resource lifecycle.

