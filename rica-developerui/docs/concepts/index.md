# RICA Concept Library

This section explains the architecture, static-analysis, and design-pattern vocabulary used in RICA rule pages.

Use it when a violation mentions a concept that is technically correct but not yet familiar, such as infrastructure, dependency inversion, gateway, adapter, DTO, repository, transaction boundary, dependency graph, or Strategy pattern.

## Architecture Concepts

- [Layered Architecture](./layered-architecture.md) explains controllers, services, repositories, entities, and why each layer has a focused responsibility.
- [Clean Architecture](./clean-architecture.md) explains inner and outer layers, framework independence, and dependency direction.
- [SOLID Principles](./solid-principles.md) explains the object-oriented principles behind many RICA findings.
- [Separation of Concerns](./separation-of-concerns.md) explains why classes should not mix HTTP, business, persistence, and infrastructure responsibilities.
- [Dependency Inversion](./dependency-inversion.md) explains why high-level policy should depend on interfaces instead of concrete infrastructure.
- [Dependency Injection](./dependency-injection.md) explains constructor injection, field injection, containers, and why direct `new` calls create coupling.
- [Ports and Adapters](./ports-and-adapters.md) explains inbound ports, outbound ports, and adapter placement in hexagonal architecture.
- [Controllers, Services, and Repositories](./controllers-services-repositories.md) gives the practical Java/Spring split between HTTP handling, business workflows, and persistence.
- [Repository Pattern](./repository-pattern.md) explains what belongs in repositories and why query annotations belong at the persistence boundary.
- [Service Layer Pattern](./service-layer-pattern.md) explains why business use cases should be orchestrated in services.
- [Domain Model vs Anemic Model](./domain-model-vs-anemic-model.md) explains the tradeoff between behavior-rich domain objects and passive data holders.
- [Infrastructure](./infrastructure.md) explains databases, HTTP clients, SDKs, files, queues, and other external mechanisms.
- [Gateways and Adapters](./gateways-and-adapters.md) explains how to isolate external APIs behind local contracts.
- [Entities, DTOs, and API Contracts](./entities-dtos-api-contracts.md) explains why internal models should not become public JSON contracts.
- [API Boundary Design](./api-boundary-design.md) explains request and response contracts, versioning, sensitive data leaks, and client stability.
- [Validation and Error Boundaries](./validation-and-error-boundaries.md) explains where request validation and exception-to-response mapping belong.
- [Transaction Boundaries](./transaction-boundaries.md) explains where `@Transactional` usually belongs and why transaction logic should be explicit.
- [Framework Coupling](./framework-coupling.md) explains how Spring, JPA, servlet, and SDK imports can leak technical details into the wrong layer.
- [Dependency Graphs and Cycles](./dependency-graphs-and-cycles.md) explains cycles, fan-in, fan-out, and why graph rules matter.
- [Package Boundaries](./package-boundaries.md) explains why Java imports reveal architecture direction.

## Static Analysis Concepts

- [Static Analysis Basics](./static-analysis-basics.md) explains how RICA detects violations and why some rules are heuristic.
- [False Positives and Rule Tuning](./false-positives-and-rule-tuning.md) explains how to decide whether a finding is real or a configuration issue.
- [Refactoring Playbook](./refactoring-playbook.md) gives practical moves for common RICA fixes.
- [Spring Architecture Guide](./spring-architecture-guide.md) gives Spring-specific placement guidance for controllers, services, repositories, transactions, validation, and errors.
- [Testing Architecture Fixes](./testing-architecture-fixes.md) explains what tests to run after each kind of architecture refactor.

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

