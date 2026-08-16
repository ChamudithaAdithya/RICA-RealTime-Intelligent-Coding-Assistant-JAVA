# RICA-V108 — Anemic Entity

<Badge type="tip" text="Info" />

> **Stage**: Stage 1 — Layer-Specific Detectors

| | |
| --- | --- |
| Detector | `EntityLayerAnalyzer` (EntityLayer) |
| Layer | entity |
| Configuration | `enableBusinessLogicChecks` |
| Related rules | [`RICA-V104`](./RICA-V104.md) |
| Source | `src/entityLayerDetector.ts:246` |

## Trigger

An entity has zero methods, or more than 80% of its methods are plain getters/setters with no behavior.

### Before (violates)

```
@Entity
public class Account {
    private BigDecimal balance;

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}
```


### After (fixed)

```
@Entity
public class Account {
    private BigDecimal balance;

    public void deposit(BigDecimal amount) {
        this.balance = this.balance.add(amount);
    }

    public boolean canWithdraw(BigDecimal amount) {
        return this.balance.compareTo(amount) >= 0;
    }
}
```


## Why it matters

A class with no behavior captures no business contract — it is just a dumb data holder. In domain-driven designs, entities should encapsulate invariants and rules (they tell you what the domain concept *does*). RICA reports this at `info` level because anemic entities are sometimes an intentional, acceptable trade-off.

## How to fix

1. Identify business rules that operate on the entity's own state.
2. Move them onto the entity as behavior methods.
3. If the entity genuinely is a pure data holder, verify this is intentional and rely on services for behavior.

## Mitigation hint

> Add behavior (methods) to the entity instead of keeping it as a pure data holder

## Tags

`anemic` `entity` `ddd`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
