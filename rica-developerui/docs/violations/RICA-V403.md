# RICA-V403 — Cyclic / Inverted Dependency

<Badge type="danger" text="Error" />

> **Severity context**: <Badge type="danger" text="Error" /> True SCC cycle between classes (Tarjan) <Badge type="warning" text="Warning" /> Inverted dependency edge (lower layer → higher layer, ruleId INVERTED_DEP)

> **Stage**: Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)

| | |
| --- | --- |
| Detector | `cyclicDependencyRule (dependencyGraph.ts)` (CrossFileAnalyzer) |
| Layer | cross-layer / graph |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V402`](./RICA-V402.md), [`RICA-V501`](./RICA-V501.md) |
| Source | `src/dependencyGraph.ts:585` |

## Trigger

Tarjan SCC finds a true cycle among classes, or an inverted edge (a lower layer depending on a higher layer) appears when following `calls`/`has-a`/`uses` edges.

### Before (violates)

```
// A depends on B, B depends on C, C depends on A
class A { B b; }
class B { C c; }
class C { A a; } // cycle!
```


## Why it matters

Circular dependencies make the code impossible to test in isolation, block other components, and cause initialization and packaging headaches. Inverted edges violate the Dependency Rule and prevent lower layers from being reused by anything above them.

## How to fix

1. Break the cycle by extracting the shared members into a separate module/class.
2. Introduce an interface in the lower layer and let the higher layer implement it.
3. Apply the Dependency Inversion Principle so high-level policies do not depend on low-level details.

## Mitigation hint

> Break the cycle by extracting shared logic into a separate module or introducing an interface

## Tags

`cycle` `graph` `inversion` `layering`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
