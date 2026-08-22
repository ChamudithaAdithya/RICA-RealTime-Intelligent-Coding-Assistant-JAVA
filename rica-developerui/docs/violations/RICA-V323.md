# RICA-V323 — Missing Bridge

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingBridge` (DesignPatternAnalyzer) |
| Layer | any (abstract hierarchy) |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V307`](./RICA-V307.md), [`RICA-V303`](./RICA-V303.md) |
| Source | `src/designPatternAnalyzer.ts:1030` |

## Trigger

An abstract class has ≥4 concrete subclasses whose names exhibit combinatorial naming (e.g., RedSquare, BlueSquare, RedCircle, BlueCircle or DatabaseLogger, FileLogger, DatabaseNotifier, FileNotifier) indicating two orthogonal dimensions collapsed into one inheritance hierarchy. Both prefix and suffix repetition must appear.

### Before (violates)

```
abstract class Shape { abstract void draw(); }
class RedSquare extends Shape { void draw() { /* red square */ } }
class BlueSquare extends Shape { void draw() { /* blue square */ } }
class RedCircle extends Shape { void draw() { /* red circle */ } }
class BlueCircle extends Shape { void draw() { /* blue circle */ } }
```


### After (fixed)

```
interface Color { void apply(); }
class Red implements Color { void apply() { /* red */ } }
abstract class Shape { protected final Color color; Shape(Color c){this.color=c;} abstract void draw(); }
class Square extends Shape { Square(Color c){super(c);} void draw(){ color.apply(); /* square */ } }
```


## Why it matters

Collapsing two independent dimensions (e.g., color × shape, storage × notifier) into a single hierarchy causes combinatorial explosion: adding one value to either dimension multiplies the class count. The Bridge pattern decouples abstraction from implementation via composition, keeping hierarchies linear and extensible.

## How to fix

1. Identify the two orthogonal dimensions (e.g., abstraction = Shape, implementation = Color).
2. Extract the second dimension as a composed interface/strategy (e.g., `private final Color color`).
3. Let concrete abstractions delegate to the implementation instead of encoding it in the class name.

## Mitigation hint

> Decouple orthogonal dimensions via composition (Bridge) instead of exploding into combinatorial subclasses

## Tags

`bridge` `hierarchy` `structural` `composition`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
