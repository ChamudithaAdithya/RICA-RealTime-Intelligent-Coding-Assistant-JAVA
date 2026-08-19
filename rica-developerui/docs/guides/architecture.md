# Layered Architecture

RICA checks a strict, dependency-rule style layering for Java Spring projects. The layer of a class is decided by its stereotype and, when that is ambiguous, by its package and naming:

| Layer | Classifiers | Detector |
| --- | --- | --- |
| Presentation | `@RestController`, `@Controller` | `ControllerLayerAnalyzer` |
| Application | `@Service`, `@Component` services | `ServiceLayerAnalyzer` |
| Domain | `@Entity`, JPA/Hibernate domain classes | `EntityLayerAnalyzer` |
| API resource | `@RestController`/`@Resource` exposing the outside API | `APIResourceLayerAnalyzer` |
| Infrastructure | repositories, DAOs, adapters, `@Repository`/`@Mapper`, **`**/feign/**`** and **`**/feignClient/**`** packages | `PackageBoundaryAnalyzer` |

## The dependency rule

- Inner layers must not depend on outer layers.
- `infrastructure` implements interfaces of `domain`/`application`; it never calls `presentation`.
- `@Component`-only controller classes (no `@RestController`/`@Controller` mapping) are **not** treated as presentation — they fall through to the layer matching their package/behavior.

These boundaries are enforced by the cross-file graph rules (`src/dependencyGraph.ts`) and the package-boundary rule `RICA-V501` (`src/packageBoundaryDetector.ts`).

## Related rules

- Presentation layer: `[RICA-V101](./../violations/RICA-V101.md)`, `[RICA-V106](./../violations/RICA-V106.md)`, `[RICA-V110](./../violations/RICA-V110.md)`, `[RICA-V201](./../violations/RICA-V201.md)`–`[RICA-V204](./../violations/RICA-V204.md)`
- Application layer: `[RICA-V101](./../violations/RICA-V101.md)`, `[RICA-V102](./../violations/RICA-V102.md)`, `[RICA-V104](./../violations/RICA-V104.md)`
- Domain layer: `[RICA-V108](./../violations/RICA-V108.md)`, `[RICA-V109](./../violations/RICA-V109.md)`, `[RICA-V111](./../violations/RICA-V111.md)`–`[RICA-V114](./../violations/RICA-V114.md)`
- Graph: `[RICA-V401](./../violations/RICA-V401.md)`–`[RICA-V404](./../violations/RICA-V404.md)`, boundaries: `[RICA-V501](./../violations/RICA-V501.md)`