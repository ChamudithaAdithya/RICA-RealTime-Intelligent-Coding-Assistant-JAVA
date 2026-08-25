# RICA-V323 - Missing Bridge

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 - Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingBridge` (DesignPatternAnalyzer) |
| Layer | any (abstract hierarchy) |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V307`](./RICA-V307.md), [`RICA-V303`](./RICA-V303.md) |
| Source | `src/designPatternAnalyzer.ts:1030` |

## Trigger

An abstract class has >=4 concrete subclasses whose names exhibit combinatorial naming (e.g., RedSquare, BlueSquare, RedCircle, BlueCircle or DatabaseLogger, FileLogger, DatabaseNotifier, FileNotifier) indicating two orthogonal dimensions collapsed into one inheritance hierarchy. Both prefix and suffix repetition must appear.

### Violating example

```
abstract class Shape { abstract void draw(); }
class RedSquare extends Shape { void draw() { /* red square */ } }
class BlueSquare extends Shape { void draw() { /* blue square */ } }
class RedCircle extends Shape { void draw() { /* red circle */ } }
class BlueCircle extends Shape { void draw() { /* blue circle */ } }
```


### Fixed version

```
interface Color { void apply(); }
class Red implements Color { void apply() { /* red */ } }
abstract class Shape { protected final Color color; Shape(Color c){this.color=c;} abstract void draw(); }
class Square extends Shape { Square(Color c){super(c);} void draw(){ color.apply(); /* square */ } }
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- abstract class Shape { abstract void draw(); }
- class RedSquare extends Shape { void draw() { /* red square */ } }
- class BlueSquare extends Shape { void draw() { /* blue square */ } }
- class RedCircle extends Shape { void draw() { /* red circle */ } }
- class BlueCircle extends Shape { void draw() { /* blue circle */ } }
+ interface Color { void apply(); }
+ class Red implements Color { void apply() { /* red */ } }
+ abstract class Shape { protected final Color color; Shape(Color c){this.color=c;} abstract void draw(); }
+ class Square extends Shape { Square(Color c){super(c);} void draw(){ color.apply(); /* square */ } }
```


## Why it matters

Collapsing two independent dimensions (e.g., color x shape, storage x notifier) into a single hierarchy causes combinatorial explosion: adding one value to either dimension multiplies the class count. The Bridge pattern decouples abstraction from implementation via composition, keeping hierarchies linear and extensible.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Design pattern basics](../concepts/design-patterns.md) - Learn what design patterns are, when they help, and when applying them creates accidental complexity.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.
- [Static analysis basics](../concepts/static-analysis-basics.md) - Learn how RICA detects source-code patterns and why some rules are heuristic.
- [Ports and Adapters](../concepts/ports-and-adapters.md) - Learn inbound ports, outbound ports, and adapter placement in hexagonal architecture.

## Is this a real violation?

Use this quick check before refactoring:

| Check | What to look for |
| --- | --- |
| Code context | Confirm the file really belongs to the detected layer: `any (abstract hierarchy)`. |
| Ownership | Ask whether the highlighted dependency, framework type, or responsibility is owned by this layer. |
| Test/support code | If this is a test fixture, sample, migration, or generated class, decide whether RICA should exclude that path. |
| Better design outcome | If the suggested move improves testability, replacement, or API stability, treat it as a real violation. |
| Rule tuning | If the structure is valid but RICA classified it too broadly, tune configuration instead of moving correct code. |

Design-pattern rules are heuristic. They detect strong design smells, not absolute proof. Prefer a small refactor only when the pattern removes real duplication, coupling, or lifecycle risk.


## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Identify the two orthogonal dimensions (e.g., abstraction = Shape, implementation = Color).**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Extract the second dimension as a composed interface/strategy (e.g., `private final Color color`).**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
3. **Let concrete abstractions delegate to the implementation instead of encoding it in the class name.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V323 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Decouple orthogonal dimensions via composition (Bridge) instead of exploding into combinatorial subclasses

## Tags

`bridge` `hierarchy` `structural` `composition`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
