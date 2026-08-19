# RICA-V400 — Unmapped Graph Rule (fallback)

<Badge type="warning" text="Warning" />

> **Stage**: Stage 2 — Fallback

| | |
| --- | --- |
| Detector | `CrossFileAnalyzer (fallback)` (CrossFileAnalyzer) |
| Layer | cross-file |
| Configuration | Not configurable (always on) |
| Related rules | — |
| Source | `src/crossFileAnalyzer.ts:32` |

## Trigger

Any cross-file rule whose rule id is not mapped to a specific code. Currently reachable only if a new AnalyzerRule is registered without a `CROSS_FILE_CODE_MAP` entry.

## Why it matters

Acts as a safety net so an unregistered graph rule is still surfaced to the user rather than silently swallowed. New rules should always be documented with a real code.

## How to fix

1. Add the new rule id to `CROSS_FILE_CODE_MAP` and give it a documented code.
2. Or map the rule to an existing architectural code.

## Mitigation hint

> Map the graph rule to a specific documented violation code

## Tags

`fallback` `graph` `internal`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
