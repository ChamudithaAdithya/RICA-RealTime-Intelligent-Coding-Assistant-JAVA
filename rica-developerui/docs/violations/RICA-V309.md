# RICA-V309 — Fat Interface

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkFatInterface` (DesignPatternAnalyzer) |
| Layer | interface |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V307`](./RICA-V307.md), [`RICA-V302`](./RICA-V302.md) |
| Source | `src/designPatternAnalyzer.ts:588` |

## Trigger

An interface declares more methods than the configured limit, or clients use less than half of a reasonably sized interface surface.

## Why it matters

Large interfaces force clients to depend on operations they do not use. This violates the Interface Segregation Principle and makes changes ripple through unrelated callers.

## How to fix

1. Split the interface by cohesive responsibilities.
2. Point each client at the smallest interface it actually needs.
3. Keep broad facade contracts separate from focused domain ports.

## Mitigation hint

> Split this interface by responsibility (ISP) - clients should depend only on the methods they actually use

## Tags

`isp` `interface` `solid`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
