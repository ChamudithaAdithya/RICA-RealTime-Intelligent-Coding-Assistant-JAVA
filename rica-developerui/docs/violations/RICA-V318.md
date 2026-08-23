# RICA-V318 — Hardcoded Notifications

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkHardcodedNotifier` (DesignPatternAnalyzer) |
| Layer | service |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V313`](./RICA-V313.md) |
| Source | `src/designPatternAnalyzer.ts:938` |

## Trigger

One method directly calls several notification, audit, event, or publisher targets.

## Why it matters

Hardcoding every side effect into the use case makes notification policy difficult to change and test. Observer/event publication lets subscribers vary independently from the core workflow.

## How to fix

1. Publish a domain/application event at the state change.
2. Move each notification or audit side effect into a subscriber/listener.
3. Keep the core method unaware of concrete notification channels.

## Mitigation hint

> Decouple notification/audit side-effects via an Observer/event bus instead of direct multi-service calls

## Tags

`observer` `events` `notifications`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
