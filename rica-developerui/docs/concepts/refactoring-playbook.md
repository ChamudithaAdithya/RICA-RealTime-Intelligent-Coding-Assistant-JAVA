# Refactoring Playbook

This page gives practical moves for common RICA findings.

## Move Business Logic To A Service

Use when a controller/resource/entity has loops, branches, calculations, or workflow decisions.

```java
return orderService.calculateTotal(request.toCommand());
```

Related rules: `RICA-V106`, `RICA-V204`.

## Create Request And Response DTOs

Use when an endpoint accepts or returns entities.

```java
record OrderResponse(long id, BigDecimal total) {}
```

Related rules: `RICA-V201`, `RICA-V202`, `RICA-V207`.

## Move SQL To A Repository

Use when SQL, JPA, or JDBC appears in controllers/services/entities.

```java
interface OrderRepository extends JpaRepository<OrderEntity, Long> {}
```

Related rules: `RICA-V114`, `RICA-V501`.

## Introduce A Gateway Or Adapter

Use when HTTP clients, SDKs, or external APIs appear in application code.

```java
interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

Related rules: `RICA-V110`, `RICA-V301`, `RICA-V322`.

## Add Constructor Injection

Use when dependencies are built with `new`, looked up dynamically, or declared without injection.

```java
OrderService(OrderRepository repository) {
    this.repository = repository;
}
```

Related rules: `RICA-V101`, `RICA-V102`, `RICA-V103`, `RICA-V205`, `RICA-V320`.

## Replace Branching With A Pattern

Use Strategy, State, Command, or Template Method when branching represents real behavior variation.

Related rules: `RICA-V303`, `RICA-V310`, `RICA-V316`, `RICA-V317`.

## Practical Fix Rule

Choose the smallest refactor that moves the responsibility to the layer that owns it.

