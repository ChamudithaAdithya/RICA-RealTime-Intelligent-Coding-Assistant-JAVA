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

### Before (violates)

```
class Registry {
    public static List<String> items = new ArrayList<>();
    public static Map<String, String> config = new HashMap<>();
}
```


### After (fixed)

```
@Component
public class Registry {
    private final Map<String, String> config; // injected/immutable
    public Registry() { this.config = Map.of("region", "us-east-1"); }
}
```


## Why it matters

Static mutable state is shared global state: one instance per JVM, unwritable to control in tests, and a magnet for concurrency bugs and memory growth. Prefer DI-scoped beans or immutable constants.

## How to fix

1. Replace the static mutable collection with DI-managed beans (`@Bean`, `@Scope`).
2. Or make the state immutable (`final`, `Collections.unmodifiableMap`).
3. If cache-like, use a dedicated cache with eviction, not a static field.

## Mitigation hint

> Replace static mutable state with DI-scoped beans (@Bean, @Scope) or immutable configuration

## Tags

`singleton` `static` `mutable` `concurrency`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
