# RICA-V310 — Missing Command

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkMissingCommand` (DesignPatternAnalyzer) |
| Layer | service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V304`](./RICA-V304.md), [`RICA-V302`](./RICA-V302.md) |
| Source | `src/designPatternAnalyzer.ts:664` |

## Trigger

A complex method performs multiple distinct persistence writes without a transactional boundary or command object.

## Why it matters

Multi-step writes are workflow units. When they are left inline, retry, rollback, auditing, and testing concerns become tangled with service logic. A Command object or explicit transaction boundary makes the write sequence intentional.

## Learn the concepts behind this rule

These background pages explain the architecture and pattern vocabulary used by this rule:

- [Transaction boundaries](../concepts/transaction-boundaries.md) - Learn where transaction ownership usually belongs and why multi-step writes need explicit boundaries.
- [Service Layer pattern](../concepts/service-layer-pattern.md) - Learn why business use cases should be orchestrated in services rather than controllers or repositories.
- [Testing architecture fixes](../concepts/testing-architecture-fixes.md) - Learn which tests to run after moving logic, DTOs, SQL, gateways, or design-pattern behavior.
- [Refactoring playbook](../concepts/refactoring-playbook.md) - See practical refactoring moves for common RICA fixes.
- [Behavioral patterns](../concepts/behavioral-patterns.md) - Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.
- [Clean Architecture and dependency direction](../concepts/clean-architecture.md) - Learn why source dependencies should point inward and why framework details belong outside core code.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Wrap the write sequence in an explicit Command object or use-case class.**
   This keeps the code aligned with the service responsibility expected by RICA-V310.
2. **Add a transactional boundary where the unit of work must commit atomically.**
   This keeps the code aligned with the service responsibility expected by RICA-V310.
3. **Keep validation and write orchestration visible at one boundary.**
   This keeps the code aligned with the service responsibility expected by RICA-V310.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V310 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Encapsulate each multi-step write sequence as a Command object (or @Transactional boundary) to keep transactions explicit

## Tags

`command` `transaction` `persistence`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
