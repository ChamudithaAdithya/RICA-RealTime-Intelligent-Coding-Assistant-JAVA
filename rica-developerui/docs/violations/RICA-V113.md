# RICA-V113 — Static Cache

<Badge type="warning" text="Warning" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `ControllerLayerAnalyzer` (ControllerLayer) |
| Layer | controller |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V305`](./RICA-V305.md) |
| Source | `src/controllerLayerDetector.ts:368` |

## Trigger

A Controller declares a `static` map-like or cache-typed field whose name hints at a cache (contains `cache`, `store`, `pool`, or `buffer`).

### Violating example

```
@RestController
public class LookupController {
    static Map<String, String> cache = new HashMap<>();

    @GetMapping("/lookup")
    public String lookup(@RequestParam String key) {
        return cache.computeIfAbsent(key, k -> "value");
    }
}
```


### Fixed version

```
@RestController
public class LookupController {
    private final LookupService lookupService; // uses CacheManager

    @GetMapping("/lookup")
    public String lookup(@RequestParam String key) {
        return lookupService.lookup(key);
    }
}
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @RestController
  public class LookupController {
-     static Map<String, String> cache = new HashMap<>();
+     private final LookupService lookupService; // uses CacheManager

      @GetMapping("/lookup")
      public String lookup(@RequestParam String key) {
-         return cache.computeIfAbsent(key, k -> "value");
+         return lookupService.lookup(key);
      }
  }
```


## Why it matters

Static mutable state in a controller persists across all instances and requests. It can leak memory, create concurrency bugs, and silently wed tests to production state. Caching should be a scoped, managed construct — a cache service bean or `@Cacheable` — so lifecycle and eviction are controlled.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Remove the static field.**
   This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.
2. **Use a dedicated cache service bean or `@Cacheable`/`@EnableCaching`.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.
3. **If a simple map is really needed, scope it as a bean with a bounded capacity.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V113 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Replace static cache with a scoped cache service bean (@Cacheable or a dedicated cache manager)

## Tags

`cache` `static` `concurrency` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
