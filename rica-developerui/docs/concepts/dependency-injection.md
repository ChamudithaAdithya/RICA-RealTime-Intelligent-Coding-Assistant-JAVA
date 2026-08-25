# Dependency Injection

Dependency injection means a class receives the collaborators it needs instead of constructing them itself.

In Spring, this is usually done through constructor injection.

## Bad: Direct Construction

```java
@Service
class OrderService {
    public Order find(long id) {
        OrderRepository repository = new OrderRepository();
        return repository.findById(id);
    }
}
```

The service now controls repository construction, lifecycle, and concrete implementation.

## Better: Constructor Injection

```java
@Service
class OrderService {
    private final OrderRepository repository;

    OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    public Order find(long id) {
        return repository.findById(id);
    }
}
```

Now Spring supplies the dependency, and tests can supply a fake or mock.

## Field Injection

Field injection works, but constructor injection is usually clearer:

```java
@Autowired
private OrderRepository repository;
```

Constructor injection makes required dependencies visible and supports immutable `final` fields.

## Why RICA Cares

Direct `new` calls against repositories, services, SDK clients, HTTP clients, or heavyweight resources often create hidden coupling. The class becomes harder to test and harder to reconfigure.

## Common Mistakes

- Creating a service inside a controller method.
- Creating a repository inside a service method.
- Using `ApplicationContext.getBean()` as a service locator.
- Making dependencies static to avoid injection.

## Practical Fix Rule

If the collaborator is part of the application graph, inject it. If it is a value object with no external lifecycle, direct construction is usually fine.

