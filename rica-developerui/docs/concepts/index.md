# RICA Concept Library

This section explains the architecture and design-pattern vocabulary used in RICA rule pages.

Use it when a violation mentions a concept that is technically correct but not yet familiar, such as infrastructure, dependency inversion, gateway, adapter, DTO, repository, or Strategy pattern.

## Architecture Concepts

- [Layered Architecture](./layered-architecture.md) explains controllers, services, repositories, entities, and why each layer has a focused responsibility.
- [Clean Architecture](./clean-architecture.md) explains inner and outer layers, framework independence, and dependency direction.
- [Dependency Inversion](./dependency-inversion.md) explains why high-level policy should depend on interfaces instead of concrete infrastructure.
- [Dependency Injection](./dependency-injection.md) explains constructor injection, field injection, containers, and why direct `new` calls create coupling.
- [Controllers, Services, and Repositories](./controllers-services-repositories.md) gives the practical Java/Spring split between HTTP handling, business workflows, and persistence.
- [Infrastructure](./infrastructure.md) explains databases, HTTP clients, SDKs, files, queues, and other external mechanisms.
- [Gateways and Adapters](./gateways-and-adapters.md) explains how to isolate external APIs behind local contracts.
- [Entities, DTOs, and API Contracts](./entities-dtos-api-contracts.md) explains why internal models should not become public JSON contracts.
- [Validation and Error Boundaries](./validation-and-error-boundaries.md) explains where request validation and exception-to-response mapping belong.
- [Package Boundaries](./package-boundaries.md) explains why Java imports reveal architecture direction.

## Design Pattern Concepts

- [Design Pattern Basics](./design-patterns.md) explains what patterns are and when they help.
- [Creational Patterns](./creational-patterns.md) explains Factory, Builder, Singleton, and Prototype.
- [Structural Patterns](./structural-patterns.md) explains Adapter, Facade, Proxy, Decorator, and Composite.
- [Behavioral Patterns](./behavioral-patterns.md) explains Strategy, State, Observer, Command, and Template Method.
- [Concurrency and Resource Boundaries](./concurrency-boundaries.md) explains threads, executors, sockets, connections, and lifecycle ownership.

## How To Read A Violation Page

1. Start with the trigger to understand what RICA detected.
2. Read the concept links to understand the principle behind the rule.
3. Compare the violating example, fixed version, and diff.
4. Follow the checklist in "How to fix".
5. Re-run RICA and run the affected project tests.

