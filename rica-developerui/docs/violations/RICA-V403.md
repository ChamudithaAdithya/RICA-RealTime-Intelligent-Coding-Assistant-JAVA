# RICA-V403 - Cyclic / Inverted Dependency

<Badge type="danger" text="Error" />

> **Severity context**: <Badge type="danger" text="Error" /> True SCC cycle between classes (Tarjan) <Badge type="warning" text="Warning" /> Inverted dependency edge (lower layer → higher layer, ruleId INVERTED_DEP)

> **Stage**: Stage 2 - Cross-File Graph Rules (CrossFileAnalyzer)

| | |
| --- | --- |
| Detector | `cyclicDependencyRule (dependencyGraph.ts)` (CrossFileAnalyzer) |
| Layer | cross-layer / graph |
| Configuration | `enableArchitecturalChecks` |
| Related rules | [`RICA-V402`](./RICA-V402.md), [`RICA-V501`](./RICA-V501.md) |
| Source | `src/dependencyGraph.ts:585` |

## Trigger

Tarjan SCC finds a true cycle among classes, or an inverted edge (a lower layer depending on a higher layer) appears when following `calls`/`has-a`/`uses` edges.

### Violating example

```
// A depends on B, B depends on C, C depends on A
class A { B b; }
class B { C c; }
class C { A a; } // cycle!
```


## Why it matters

Circular dependencies make the code impossible to test in isolation, block other components, and cause initialization and packaging headaches. Inverted edges violate the Dependency Rule and prevent lower layers from being reused by anything above them.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency graphs and cycles](../concepts/dependency-graphs-and-cycles.md) - Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Package boundaries](../concepts/package-boundaries.md) - Learn how Java packages express architectural ownership and why forbidden imports are meaningful.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `cross-layer / graph`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Break the cycle by extracting the shared members into a separate module/class.**
   This keeps the code aligned with the cross-layer / graph responsibility expected by RICA-V403.
2. **Introduce an interface in the lower layer and let the higher layer implement it.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
3. **Apply the Dependency Inversion Principle so high-level policies do not depend on low-level details.**
   This keeps the code aligned with the cross-layer / graph responsibility expected by RICA-V403.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V403 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Break the cycle by extracting shared logic into a separate module or introducing an interface

## Tags

`cycle` `graph` `inversion` `layering`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
