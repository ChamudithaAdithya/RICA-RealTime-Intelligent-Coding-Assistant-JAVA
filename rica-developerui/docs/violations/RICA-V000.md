# RICA-V000 — Unmapped Legacy Violation (fallback)

<Badge type="warning" text="Warning" />

> **Stage**: Fallback

| | |
| --- | --- |
| Detector | `ViolationManager.layerViolationToUnified` (ViolationManager) |
| Layer | any |
| Configuration | Not configurable (always on) |
| Related rules | — |
| Source | `src/violationManager.ts:77` |

## Trigger

A layer-detector violation whose `type` is not present in `RULE_CODE_MAP`. Currently reachable only if a new detector type is added without a code mapping.

## Why it matters

Guarantees every violation still carries a code even when the mapping is incomplete, so the UI never shows an uncoded row. New detector types should always be assigned a real code.

## How to fix

1. Add the new detector `type` to `RULE_CODE_MAP` and document it.

## Mitigation hint

> Map the legacy detector type to a specific documented violation code

## Tags

`fallback` `internal`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
