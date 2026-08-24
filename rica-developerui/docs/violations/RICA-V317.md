# RICA-V317 — Duplicate Algorithm

<Badge type="warning" text="Warning" />

> **Stage**: Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| | |
| --- | --- |
| Detector | `checkDuplicateAlgorithm` (DesignPatternAnalyzer) |
| Layer | any |
| Configuration | `enableDesignPatternChecks` |
| Related rules | [`RICA-V303`](./RICA-V303.md), [`RICA-V323`](./RICA-V323.md) |
| Source | `src/designPatternAnalyzer.ts:879` |

## Trigger

Two methods in different classes have highly similar call sequences while varying receiver types or sub-steps.

## Why it matters

Duplicated algorithm skeletons drift independently. Template Method keeps the invariant sequence in one place and lets subclasses or collaborators supply the varying steps.

## How to fix

Use this as the practical checklist. Each item explains both the action and the reason behind it.

1. **Extract the common call sequence into a shared template method.**
   This keeps the code aligned with the any responsibility expected by RICA-V317.
2. **Move differing operations behind abstract hooks or strategy collaborators.**
   This replaces branching with named behaviors, making each variation easier to test and change independently.
3. **Keep only true variation points outside the template.**
   This keeps the code aligned with the any responsibility expected by RICA-V317.

## How to verify

1. Re-run RICA on the changed file or project.
2. Confirm RICA-V317 no longer appears at the same location.
3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.

## Mitigation hint

> Extract the common skeleton into a Template Method and vary only the differing sub-steps per class

## Tags

`template-method` `duplication` `algorithm`

---

_This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Do not edit by hand._
