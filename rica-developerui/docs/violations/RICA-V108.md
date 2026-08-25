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

### Violating example

```
@Entity
public class Account {
    private BigDecimal balance;

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}
```


### Fixed version

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


## What changed

The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.

```diff
  @Entity
  public class Account {
      private BigDecimal balance;

-     public BigDecimal getBalance() { return balance; }
-     public void setBalance(BigDecimal balance) { this.balance = balance; }
+     public void deposit(BigDecimal amount) {
+         this.balance = this.balance.add(amount);
+     }
+
+     public boolean canWithdraw(BigDecimal amount) {
+         return this.balance.compareTo(amount) >= 0;
+     }
  }
```


## Why it matters

A class with no behavior captures no business contract — it is just a dumb data holder. In domain-driven designs, entities should encapsulate invariants and rules (they tell you what the domain concept *does*). RICA reports this at `info` level because anemic entities are sometimes an intentional, acceptable trade-off.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Domain model vs anemic model](../concepts/domain-model-vs-anemic-model.md) - Learn where domain invariants belong and when entities become too passive or too busy.
- [Layered architecture](../concepts/layered-architecture.md) - Understand controllers, services, repositories, entities, and why each layer has a narrow job.
- [Controllers, services, and repositories](../concepts/controllers-services-repositories.md) - See the practical difference between inbound HTTP handling, business workflows, and persistence access.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Dependency inversion](../concepts/dependency-inversion.md) - Learn why high-level policy should depend on interfaces instead of low-level implementation classes.
- [SOLID principles](../concepts/solid-principles.md) - Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Identify business rules that operate on the entity's own state.**
   This replaces branching with named behaviors, making each variation easier to test and change independently.
2. **Move them onto the entity as behavior methods.**
   This keeps the code aligned with the entity responsibility expected by RICA-V108.
3. **If the entity genuinely is a pure data holder, verify this is intentional and rely on services for behavior.**
   This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V108 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Add behavior (methods) to the entity instead of keeping it as a pure data holder

## Tags

`anemic` `entity` `ddd`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
