# RICA-V303 — Strategy Missing

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingStrategy` (DesignPatternAnalyzer) |
| Layer | service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V304`](./RICA-V304.md) |
| Source | `src/designPatternAnalyzer.ts:374` |

## Trigger

A Service-layer method has at least 4 if/else-if branches that all evaluate the same variable, or a `switch` with at least 4 cases.

### Violating example

```
public double price(OrderType type, double amount) {
    if (type == OrderType.REGULAR) return amount;
    else if (type == OrderType.VIP) return amount * 0.8;
    else if (type == OrderType.STAFF) return amount * 0.9;
    else if (type == OrderType.SEASONAL) return amount * 0.85;
    throw new IllegalArgumentException("unknown type");
}
```


### Fixed version

```
public interface PricingStrategy { double price(double amount); }
public class RegularStrategy implements PricingStrategy { ... }
public class VipStrategy implements PricingStrategy { ... }
// strategy chosen via arithmetic map: Map<OrderType, PricingStrategy>
```


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
- public double price(OrderType type, double amount) {
-     if (type == OrderType.REGULAR) return amount;
-     else if (type == OrderType.VIP) return amount * 0.8;
-     else if (type == OrderType.STAFF) return amount * 0.9;
-     else if (type == OrderType.SEASONAL) return amount * 0.85;
-     throw new IllegalArgumentException("unknown type");
- }
+ public interface PricingStrategy { double price(double amount); }
+ public class RegularStrategy implements PricingStrategy { ... }
+ public class VipStrategy implements PricingStrategy { ... }
+ // strategy chosen via arithmetic map: Map<OrderType, PricingStrategy>
```


## Why it matters

Long conditional chains on a single discriminator are a Strategy smell: each branch is an algorithm selectable at runtime. Encoding them as separate strategy classes makes behavior extensible without editing the chain and easier to test in isolation.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Define a strategy interface for the discriminated behavior.**
   This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.
2. **Move each branch into its own strategy implementation.**
   This replaces branching with named behaviors, making each variation easier to test and change independently.
3. **Select the strategy at runtime via a factory or a map keyed by the discriminator value.**
   This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V303 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Replace the conditional chain with a Strategy pattern — each branch should be a separate class implementing a common interface

## Tags

`strategy` `conditional` `polymorphism`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
