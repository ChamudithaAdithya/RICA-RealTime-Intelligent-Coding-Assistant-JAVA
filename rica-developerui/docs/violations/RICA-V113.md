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

### Before (violates)

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


### After (fixed)

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


## Why it matters

Static mutable state in a controller persists across all instances and requests. It can leak memory, create concurrency bugs, and silently wed tests to production state. Caching should be a scoped, managed construct — a cache service bean or `@Cacheable` — so lifecycle and eviction are controlled.

## How to fix

1. Remove the static field.
2. Use a dedicated cache service bean or `@Cacheable`/`@EnableCaching`.
3. If a simple map is really needed, scope it as a bean with a bounded capacity.

## Mitigation hint

> Replace static cache with a scoped cache service bean (@Cacheable or a dedicated cache manager)

## Tags

`cache` `static` `concurrency` `controller`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
