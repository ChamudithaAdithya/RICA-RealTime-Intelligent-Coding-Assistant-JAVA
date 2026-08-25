# Glossary

This page gives short definitions for terms used across RICA documentation.

| Term | Meaning |
| --- | --- |
| Adapter | A class that translates between an external API/SDK and a local interface. |
| API boundary | The point where external clients interact with the application, usually controllers, request DTOs, response DTOs, validation, and error responses. |
| Application layer | The layer that coordinates use cases and business workflows. Often implemented as services or command handlers. |
| Boundary | A line between responsibilities, such as controller vs service, service vs repository, or application vs infrastructure. |
| Command | A named object or handler that represents a workflow action. RICA maps this mostly to [`RICA-V310`](../violations/RICA-V310.md). |
| Controller | The inbound HTTP adapter that receives requests, validates input, calls application logic, and shapes responses. |
| Dependency graph | A graph of source relationships, such as class/package imports and calls. RICA uses this for graph-level architecture rules. |
| Dependency injection | Supplying a class with its dependencies instead of constructing them internally. |
| Dependency inversion | Depending on stable abstractions rather than concrete low-level details. |
| DTO | Data Transfer Object. A request or response data shape used at a boundary. |
| Entity | A domain or persistence model representing an internal business concept. |
| Facade | A simplified interface over several subsystem operations. A facade becomes harmful when it turns into a god facade. |
| False positive | A reported finding that is not actually a design problem for the current project context. |
| Gateway | A local interface that represents an external capability, such as payments, email, storage, or inventory. |
| Heuristic | A practical detection rule based on strong code signals rather than runtime proof. |
| Infrastructure | Technical mechanism code: databases, HTTP clients, SDKs, files, queues, caches, sockets, and framework adapters. |
| Layer | A group of code with a shared responsibility, such as controller, service, domain, repository, or infrastructure. |
| Port | An interface owned by the application that describes either an inbound use case or outbound dependency. |
| Repository | A persistence boundary that loads and saves data and owns query details. |
| Service | A class that coordinates a use case or business workflow. |
| Strategy | A behavioral pattern that replaces algorithm-selection branches with interchangeable behavior classes. RICA maps this to [`RICA-V303`](../violations/RICA-V303.md). |
| Transaction boundary | The unit of work that should commit or roll back together, commonly declared on service/use-case methods. |

## Practical Fix Rule

When a term is unclear, open the matching concept page first, then return to the violation page and apply the smallest refactor that restores the correct responsibility boundary.

