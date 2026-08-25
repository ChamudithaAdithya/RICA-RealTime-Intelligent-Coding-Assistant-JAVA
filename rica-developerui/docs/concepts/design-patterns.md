# Design Pattern Basics

A design pattern is a named solution to a recurring design problem.

Patterns are useful because they give developers shared language. "Use Strategy here" is shorter than "replace this growing conditional with interchangeable behavior objects selected at runtime."

## Pattern Families

| Family | Main question | Examples | RICA concept page |
| --- | --- | --- | --- |
| Creational | How should objects be created? | Factory, Builder, Singleton, Prototype | [Creational Patterns](./creational-patterns.md) |
| Structural | How should objects be composed or wrapped? | Adapter, Facade, Proxy, Decorator, Composite, Bridge | [Structural Patterns](./structural-patterns.md) |
| Behavioral | How should behavior and communication be organized? | Strategy, State, Observer, Command, Template Method, Chain of Responsibility | [Behavioral Patterns](./behavioral-patterns.md) |

## RICA Design Pattern Rule Map

| RICA rule | Pattern / smell | What RICA usually sees | Fix direction |
| --- | --- | --- | --- |
| [`RICA-V301`](../violations/RICA-V301.md) | Adapter Missing | Core/application code imports vendor SDK or external API types directly. | Wrap the external type behind a local port and infrastructure adapter. |
| [`RICA-V302`](../violations/RICA-V302.md) | God Facade | One facade class coordinates too many unrelated subsystem operations. | Split the facade by business capability or subsystem boundary. |
| [`RICA-V303`](../violations/RICA-V303.md) | Strategy Missing | Long conditional chain selects algorithms by type, status, mode, or channel. | Move each algorithm into a Strategy implementation. |
| [`RICA-V304`](../violations/RICA-V304.md) | Factory Missing | The same concrete implementation is constructed from several callers. | Centralize construction in a Factory/provider and return the abstraction. |
| [`RICA-V305`](../violations/RICA-V305.md) | Mutable Singleton | Static mutable collections/builders/global state are shared across the app. | Use container-managed beans, immutable state, or scoped caches. |
| [`RICA-V306`](../violations/RICA-V306.md) | Raw Thread Spawn | Business code creates `Thread` or unmanaged executor work directly. | Move execution policy to framework-managed async infrastructure. |
| [`RICA-V307`](../violations/RICA-V307.md) | Missing Abstraction | Code depends on concrete implementations across a boundary. | Introduce an interface/port owned by the caller side. |
| [`RICA-V308`](../violations/RICA-V308.md) | Leaking Construction Logic | Business methods contain complex repeated object assembly. | Move assembly into a Builder, Factory, or assembler. |
| [`RICA-V309`](../violations/RICA-V309.md) | Fat Interface | One interface forces implementations/clients to depend on unrelated methods. | Split it into smaller role-specific interfaces. |
| [`RICA-V310`](../violations/RICA-V310.md) | Missing Command | Multi-step write workflow is inline and hard to retry, audit, or rollback. | Wrap the workflow in a Command/use-case class or explicit transaction boundary. |
| [`RICA-V311`](../violations/RICA-V311.md) | Missing Prototype | Code manually copies many fields from one object to another. | Use copy constructors, `copyOf`, `clone`, or a mapper/prototype method. |
| [`RICA-V312`](../violations/RICA-V312.md) | Fragmented Factories | Multiple concrete factories share no common creation contract. | Introduce an Abstract Factory interface for related product families. |
| [`RICA-V313`](../violations/RICA-V313.md) | Missing Decorator | Cross-cutting behavior is duplicated inside business methods. | Wrap behavior with Decorator/AOP instead of repeating it. |
| [`RICA-V314`](../violations/RICA-V314.md) | Missing Composite | Tree-like objects are handled with repeated type checks. | Give leaves and containers one common Composite interface. |
| [`RICA-V315`](../violations/RICA-V315.md) | Flyweight Missing | Many small repeated immutable objects are created instead of shared. | Cache/share immutable intrinsic state. |
| [`RICA-V316`](../violations/RICA-V316.md) | Scattered State Machine | State/status checks are repeated across multiple classes or methods. | Move state-specific behavior into State objects or a transition table. |
| [`RICA-V317`](../violations/RICA-V317.md) | Duplicate Algorithm | Several classes repeat the same algorithm skeleton with small step changes. | Extract the invariant skeleton using Template Method or Strategy. |
| [`RICA-V318`](../violations/RICA-V318.md) | Hardcoded Notifications | A use case directly calls many notification/audit side effects. | Publish events or use Observer subscribers. |
| [`RICA-V319`](../violations/RICA-V319.md) | Monolithic Pipeline | One method performs many sequential processing stages inline. | Split stages into Chain of Responsibility or pipeline components. |
| [`RICA-V320`](../violations/RICA-V320.md) | Service Locator | Business code calls `ApplicationContext`, `BeanFactory`, registry, or locator APIs. | Use constructor injection or inject a map/list of strategies. |
| [`RICA-V321`](../violations/RICA-V321.md) | Excessive Null Checks | Code repeatedly guards null instead of modeling absence clearly. | Use Null Object, Optional at boundaries, or explicit validation. |
| [`RICA-V322`](../violations/RICA-V322.md) | Missing Proxy | Business code directly creates/accesses heavyweight resources. | Use a Proxy/managed wrapper/interface in infrastructure. |
| [`RICA-V323`](../violations/RICA-V323.md) | Missing Bridge | Class hierarchy combines two independent dimensions in one inheritance tree. | Split abstraction from implementation with Bridge composition. |

## Why RICA Cares

RICA does not reward patterns for their own sake. It flags cases where missing, misused, or overused patterns make code harder to change.

Common signals:

- **duplicated branches** may need Strategy or State
- **direct SDK coupling** may need Adapter or Gateway
- **repeated construction** may need Factory or Builder
- **global mutable state** may be a harmful Singleton
- **multi-step write workflows** may need Command or a clearer transaction boundary
- **tree-like type checks** may need Composite
- **resource lifecycle leaks** may need Proxy or framework-managed infrastructure

## Bad Pattern Use

```java
class UserServiceFactoryManagerProvider {
    // Big name, unclear responsibility, no real creation policy.
}
```

Pattern names should clarify design, not decorate code.

## Practical Fix Rule

Use a pattern when it removes real duplication, isolates a real boundary, or names a real variation. Avoid adding a pattern only to make code look more advanced.

