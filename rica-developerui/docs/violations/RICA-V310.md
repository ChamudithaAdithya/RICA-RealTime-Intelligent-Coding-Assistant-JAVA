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

## How to fix

1. Wrap the write sequence in an explicit Command object or use-case class.
2. Add a transactional boundary where the unit of work must commit atomically.
3. Keep validation and write orchestration visible at one boundary.

## Mitigation hint

> Encapsulate each multi-step write sequence as a Command object (or @Transactional boundary) to keep transactions explicit

## Tags

`command` `transaction` `persistence`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
