# Refactoring Playbook

This page gives practical moves for common RICA findings.

## Move Business Logic To A Service

Use when a controller/resource/entity has loops, branches, calculations, or workflow decisions.

```java
return orderService.calculateTotal(request.toCommand());
```

Related rules: [`RICA-V106`](../violations/RICA-V106.md), [`RICA-V204`](../violations/RICA-V204.md).

## Create Request And Response DTOs

Use when an endpoint accepts or returns entities.

```java
record OrderResponse(long id, BigDecimal total) {}
```

Related rules: [`RICA-V201`](../violations/RICA-V201.md), [`RICA-V202`](../violations/RICA-V202.md), [`RICA-V207`](../violations/RICA-V207.md).

## Move SQL To A Repository

Use when SQL, JPA, or JDBC appears in controllers/services/entities.

```java
interface OrderRepository extends JpaRepository<OrderEntity, Long> {}
```

Related rules: [`RICA-V114`](../violations/RICA-V114.md), [`RICA-V501`](../violations/RICA-V501.md).

## Introduce A Gateway Or Adapter

Use when HTTP clients, SDKs, or external APIs appear in application code.

```java
interface PaymentGateway {
    PaymentResult charge(PaymentCommand command);
}
```

Related rules: [`RICA-V110`](../violations/RICA-V110.md), [`RICA-V301`](../violations/RICA-V301.md), [`RICA-V322`](../violations/RICA-V322.md).

## Add Constructor Injection

Use when dependencies are built with `new`, looked up dynamically, or declared without injection.

```java
OrderService(OrderRepository repository) {
    this.repository = repository;
}
```

Related rules: [`RICA-V101`](../violations/RICA-V101.md), [`RICA-V102`](../violations/RICA-V102.md), [`RICA-V103`](../violations/RICA-V103.md), [`RICA-V205`](../violations/RICA-V205.md), [`RICA-V320`](../violations/RICA-V320.md).

## Replace Branching With A Pattern

Use Strategy, State, Command, or Template Method when branching represents real behavior variation.

Related rules: [`RICA-V303`](../violations/RICA-V303.md), [`RICA-V310`](../violations/RICA-V310.md), [`RICA-V316`](../violations/RICA-V316.md), [`RICA-V317`](../violations/RICA-V317.md).

## Practical Fix Rule

Choose the smallest refactor that moves the responsibility to the layer that owns it.

