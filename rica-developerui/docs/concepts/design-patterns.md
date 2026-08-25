# Design Pattern Basics

A design pattern is a named solution to a recurring design problem.

Patterns are useful because they give developers shared language. "Use Strategy here" is shorter than "replace this growing conditional with interchangeable behavior objects selected at runtime."

## Pattern Families

| Family | Main question | Examples |
| --- | --- | --- |
| Creational | How should objects be created? | Factory, Builder, Singleton, Prototype |
| Structural | How should objects be composed or wrapped? | Adapter, Facade, Proxy, Decorator, Composite |
| Behavioral | How should behavior and communication be organized? | Strategy, State, Observer, Command, Template Method |

## Why RICA Cares

RICA does not reward patterns for their own sake. It flags cases where missing, misused, or overused patterns make code harder to change.

Examples:

- too much conditional behavior may need Strategy or State
- direct SDK coupling may need Adapter or Gateway
- repeated object construction may need Factory or Builder
- global mutable state may be a harmful Singleton

## Bad Pattern Use

```java
class UserServiceFactoryManagerProvider {
    // Big name, unclear responsibility, no real creation policy.
}
```

Pattern names should clarify design, not decorate code.

## Practical Fix Rule

Use a pattern when it removes real duplication, isolates a real boundary, or names a real variation. Avoid adding a pattern only to make code look more advanced.

