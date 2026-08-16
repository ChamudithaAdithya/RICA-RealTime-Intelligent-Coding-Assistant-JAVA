# Design Patterns

RICA-V301–V307 flag code that hand-rolls machinery the platform already provides, or that picks the wrong structural pattern.

## Rules

| Rule | What it catches |
| --- | --- |
| `RICA-V301` Missing adapter | infrastructure/3rd-party type used directly instead of through an owning adapter (e.g. `RestTemplate`, SDK clients) |
| `RICA-V302` Missing strategy | many `if`/`else` branches evaluating the same variable (replace with Strategy) |
| `RICA-V303` Missing factory | `new ConcreteType(...)` scattered with subtype-conditional construction |
| `RICA-V304` Missing builder | object assembled with >3 chained setters/constructor args (replace with Builder) |
| `RICA-V305` Raw thread | `new Thread(...)` or direct `Runnable.run()` (use `@Async` or a `TaskExecutor`) |
| `RICA-V306` Raw executor | `Executors.*` created or `.execute()` called directly (use a Spring `TaskExecutor` bean) |
| `RICA-V307` Undocumented public API | public method/class without Javadoc explaining contracts |

On top of these, `RICA-V300` is the fallback code when a design-pattern rule matches but no canonical code fits — downstream tooling (e.g. the AI advisory) uses `V000` for the generic fallback instead.

## Why

Using Spring's `@Async`/`TaskExecutor` instead of raw threads keeps lifecycle and shutdown under the container, and an adapter around a 3rd-party SDK keeps the dependency isolated and swappable. Strategy/factory/builder keep the branch and construction logic small and testable.

## Related rules

`[RICA-V301](./../violations/RICA-V301.md)`, `[RICA-V302](./../violations/RICA-V302.md)`, `[RICA-V305](./../violations/RICA-V305.md)`.