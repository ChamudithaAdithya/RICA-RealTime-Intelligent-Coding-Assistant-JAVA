# RICA Violation Code Reference

Every code the analyzers can emit, generated from the single source of truth `src/violationCatalog.ts`. Click a code for the full page (trigger, rationale, fix steps, examples).

## Stage 1 — Layer-Specific Detectors

| Code | Name | Severity | Layer | Config |
| --- | --- | --- | --- | --- |
| [RICA-V101](./violations/RICA-V101.md) | Self-Instantiation | error | service / controller | `enableDesignPatternChecks` |
| [RICA-V102](./violations/RICA-V102.md) | Uninjected Repository Access | error | service | `enableDesignPatternChecks` |
| [RICA-V103](./violations/RICA-V103.md) | Uninjected Service Access | error | controller | `enableDesignPatternChecks` |
| [RICA-V104](./violations/RICA-V104.md) | Anemic Service | warning | service | `enableDesignPatternChecks` |
| [RICA-V106](./violations/RICA-V106.md) | Business Logic in the Wrong Layer | warning | controller / entity | `enableBusinessLogicChecks` |
| [RICA-V107](./violations/RICA-V107.md) | Direct Layer Access | error | entity | `enableDesignPatternChecks` |
| [RICA-V108](./violations/RICA-V108.md) | Anemic Entity | info | entity | `enableBusinessLogicChecks` |
| [RICA-V109](./violations/RICA-V109.md) | Improper Data Access | error | entity | `enableDesignPatternChecks` |
| [RICA-V110](./violations/RICA-V110.md) | Direct HTTP Call | error | controller | `enableDesignPatternChecks` |
| [RICA-V111](./violations/RICA-V111.md) | File I/O in Controller | error | controller | `enableDesignPatternChecks` |
| [RICA-V112](./violations/RICA-V112.md) | Background Thread | warning | controller | `enableDesignPatternChecks` |
| [RICA-V113](./violations/RICA-V113.md) | Static Cache | warning | controller | `enableDesignPatternChecks` |
| [RICA-V114](./violations/RICA-V114.md) | Raw SQL Access | error | controller | `enableDesignPatternChecks` |
| [RICA-V201](./violations/RICA-V201.md) | Exposing Internal Entity | warning | api | always on |
| [RICA-V202](./violations/RICA-V202.md) | Missing DTO Usage | warning | api | always on |
| [RICA-V203](./violations/RICA-V203.md) | Improper Error Handling | warning | api | always on |
| [RICA-V204](./violations/RICA-V204.md) | Business Logic in Resource | warning | api | `enableBusinessLogicChecks` |
| [RICA-V205](./violations/RICA-V205.md) | Direct Service Instantiation | error | api | `enableDesignPatternChecks` |
| [RICA-V206](./violations/RICA-V206.md) | Missing Validation | info | api | always on |
| [RICA-V207](./violations/RICA-V207.md) | Exposing Internal Structure | warning | api | always on |

## Stage 2 — Fallback

| Code | Name | Severity | Layer | Config |
| --- | --- | --- | --- | --- |
| [RICA-V400](./violations/RICA-V400.md) | Unmapped Graph Rule (fallback) | warning | cross-file | always on |
| [RICA-V401](./violations/RICA-V401.md) | Controller Bypass | error | controller → repository | `enableArchitecturalChecks` |
| [RICA-V402](./violations/RICA-V402.md) | Cross-Layer Violation | warning | cross-layer | `enableArchitecturalChecks` |
| [RICA-V403](./violations/RICA-V403.md) | Cyclic / Inverted Dependency | error/warning | cross-layer / graph | `enableArchitecturalChecks` |
| [RICA-V404](./violations/RICA-V404.md) | Entity Exposure | warning/info | controller api | `enableArchitecturalChecks` |

## Stage 3 — Package Boundary (PackageBoundaryAnalyzer)

| Code | Name | Severity | Layer | Config |
| --- | --- | --- | --- | --- |
| [RICA-V501](./violations/RICA-V501.md) | Package Boundary Violation | error | package / top-level layer | `enableArchitecturalChecks` |

## Stage 4 — Fallback

| Code | Name | Severity | Layer | Config |
| --- | --- | --- | --- | --- |
| [RICA-V300](./violations/RICA-V300.md) | Unmapped Design-Pattern Rule (fallback) | warning | design-pattern | always on |
| [RICA-V301](./violations/RICA-V301.md) | Adapter Missing | error | domain / application | `enableDesignPatternChecks` |
| [RICA-V302](./violations/RICA-V302.md) | God Facade | warning | service / facade | `enableDesignPatternChecks` |
| [RICA-V303](./violations/RICA-V303.md) | Strategy Missing | warning | service | `enableDesignPatternChecks` |
| [RICA-V304](./violations/RICA-V304.md) | Factory Missing | error | service / application | `enableDesignPatternChecks` |
| [RICA-V305](./violations/RICA-V305.md) | Mutable Singleton | warning | any | `enableDesignPatternChecks` |
| [RICA-V306](./violations/RICA-V306.md) | Raw Thread Spawn | error | any (outside @Configuration) | `enableDesignPatternChecks` |
| [RICA-V307](./violations/RICA-V307.md) | Missing Abstraction | warning | any | `enableDesignPatternChecks` |
| [RICA-V322](./violations/RICA-V322.md) | Missing Proxy | warning | service / application (non-infrastructure) | `enableDesignPatternChecks` |
| [RICA-V323](./violations/RICA-V323.md) | Missing Bridge | warning | any (abstract hierarchy) | `enableDesignPatternChecks` |

## Fallback

| Code | Name | Severity | Layer | Config |
| --- | --- | --- | --- | --- |
| [RICA-V000](./violations/RICA-V000.md) | Unmapped Legacy Violation (fallback) | warning | any | always on |

---

This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Run `npm run generate:docs` to regenerate.
