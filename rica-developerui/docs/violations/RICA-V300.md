# RICA-V300 — Unmapped Design-Pattern Rule (fallback)

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Fallback

| | |
| --- | --- |
| Detector | `DesignPatternAnalyzer (fallback)` (DesignPatternAnalyzer) |
| Layer | design-pattern |
| Configuration | Not configurable (always on) |
| Related rules | — |
| Source | `src/designPatternAnalyzer.ts:70` |

## Trigger

Any design-pattern rule type that is not mapped to a specific code. Currently unreachable because every emitted rule type has a dedicated code.

## Why it matters

Safety net for future design-pattern rules so they surface as visible violations rather than being swallowed. New rules should be documented with a real code.

## How to fix

1. Map the new rule type in `DP_RULE_CODES` and document it.

## Mitigation hint

> Map the design-pattern rule to a specific documented violation code

## Tags

`fallback` `design-pattern` `internal`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
