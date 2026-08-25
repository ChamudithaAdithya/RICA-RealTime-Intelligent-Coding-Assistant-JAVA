# Infrastructure

Infrastructure is code that talks to external systems or technical mechanisms.

In RICA, infrastructure includes:

- databases and SQL
- ORM/JPA details
- HTTP clients
- vendor SDKs
- file systems
- message brokers
- email/SMS clients
- caches
- sockets
- framework-specific adapters

## Why It Is Separate

Infrastructure changes for reasons that are not business reasons. A payment SDK updates. A database query changes. A queue is replaced. A retry policy changes.

Business services should not be rewritten every time a mechanism changes.

## Bad: Service Owns HTTP Details

```java
@Service
class CheckoutService {
    private final WebClient webClient;

    PaymentResult pay(Order order) {
        return webClient.post()
            .uri("https://payments.example.com/charge")
            .bodyValue(order)
            .retrieve()
            .bodyToMono(PaymentResult.class)
            .block();
    }
}
```

## Better: Infrastructure Adapter Owns HTTP Details

```java
public interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

```java
@Component
class HttpPaymentGateway implements PaymentGateway {
    private final WebClient webClient;

    public PaymentResult charge(PaymentCommand command) {
        return webClient.post()
            .uri("/charge")
            .bodyValue(command)
            .retrieve()
            .bodyToMono(PaymentResult.class)
            .block();
    }
}
```

## Why RICA Cares

When controllers or services directly own infrastructure details, tests need real or heavily mocked mechanisms. The code becomes tightly coupled to protocols instead of business behavior.

## Common Mistakes

- Placing `RestTemplate`, `WebClient`, or `HttpClient` directly in controllers.
- Putting `@Query` or SQL in services.
- Exposing SDK request/response classes from application services.
- Opening sockets or database connections inside business methods.

## Practical Fix Rule

Infrastructure code should sit at the edge and be called through a small local interface.

