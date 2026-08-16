# RICA-V307 — Missing Abstraction

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingAbstraction` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V303`](./RICA-V303.md), [`RICA-V304`](./RICA-V304.md) |
| Source | `src/designPatternAnalyzer.ts:162` |

## Trigger

An interface or abstract class has exactly one implementing class in the project.

### Before (violates)

```
public interface PaymentGateway { void charge(double amount); }
public class StripeGateway implements PaymentGateway { ... } // the only impl
```


### After (fixed)

```
// Option A: collapse the indirection
public class StripeGateway { public void charge(double amount) { ... } }
// Option B: add a real second implementation and keep the interface
```


## Why it matters

An abstraction with a single implementation is often premature indirection (YAGNI). Either it needs a second implementation to be justified, or the indirection should be collapsed. RICA warns so the cost of the seam is a deliberate choice, not an accident.

## How to fix

1. Either remove the interface and use the concrete class directly.
2. Or extract a second implementation to justify the abstraction.
3. Document why the seam exists if it is intentional (e.g. future provider).

## Mitigation hint

> Either this abstraction is unnecessary (YAGNI — consider inlining), or add more implementations to justify the indirection

## Tags

`abstraction` `interface` `yagni`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
