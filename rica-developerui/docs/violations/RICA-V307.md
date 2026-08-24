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

### Violating example

```
public interface PaymentGateway { void charge(double amount); }
public class StripeGateway implements PaymentGateway { ... } // the only impl
```


### Fixed version

```
// Option A: collapse the indirection
public class StripeGateway { public void charge(double amount) { ... } }
// Option B: add a real second implementation and keep the interface
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- public interface PaymentGateway { void charge(double amount); }
- public class StripeGateway implements PaymentGateway { ... } // the only impl
+ // Option A: collapse the indirection
+ public class StripeGateway { public void charge(double amount) { ... } }
+ // Option B: add a real second implementation and keep the interface
```


## Why it matters

An abstraction with a single implementation is often premature indirection (YAGNI). Either it needs a second implementation to be justified, or the indirection should be collapsed. RICA warns so the cost of the seam is a deliberate choice, not an accident.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Either remove the interface and use the concrete class directly.**
   This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.
2. **Or extract a second implementation to justify the abstraction.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
3. **Document why the seam exists if it is intentional (e.g. future provider).**
   This keeps the code aligned with the any responsibility expected by RICA-V307.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V307 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Either this abstraction is unnecessary (YAGNI — consider inlining), or add more implementations to justify the indirection

## Tags

`abstraction` `interface` `yagni`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
