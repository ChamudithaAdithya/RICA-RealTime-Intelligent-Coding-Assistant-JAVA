# RICA-V305 — Mutable Singleton

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMutableSingleton` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V113`](./RICA-V113.md) |
| Source | `src/designPatternAnalyzer.ts:140` |

## Trigger

A `static`, non-`final` field whose type is a mutable collection or builder (HashMap, ArrayList, HashSet, StringBuilder, Map/List/Set/Collection, etc.) exists anywhere.

### Violating example

```
class Registry {
    public static List<String> items = new ArrayList<>();
    public static Map<String, String> config = new HashMap<>();
}
```


### Fixed version

```
@Component
public class Registry {
    private final Map<String, String> config; // injected/immutable
    public Registry() { this.config = Map.of("region", "us-east-1"); }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- class Registry {
-     public static List<String> items = new ArrayList<>();
-     public static Map<String, String> config = new HashMap<>();
+ @Component
+ public class Registry {
+     private final Map<String, String> config; // injected/immutable
+     public Registry() { this.config = Map.of("region", "us-east-1"); }
  }
```


## Why it matters

Static mutable state is shared global state: one instance per JVM, unwritable to control in tests, and a magnet for concurrency bugs and memory growth. Prefer DI-scoped beans or immutable constants.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Replace the static mutable collection with DI-managed beans (`@Bean`, `@Scope`).**
   This keeps the code aligned with the any responsibility expected by RICA-V305.
2. **Or make the state immutable (`final`, `Collections.unmodifiableMap`).**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.
3. **If cache-like, use a dedicated cache with eviction, not a static field.**
   This keeps the code aligned with the any responsibility expected by RICA-V305.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V305 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Replace static mutable state with DI-scoped beans (@Bean, @Scope) or immutable configuration

## Tags

`singleton` `static` `mutable` `concurrency`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
