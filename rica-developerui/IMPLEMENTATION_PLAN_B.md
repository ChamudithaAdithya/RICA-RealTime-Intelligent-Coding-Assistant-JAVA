# Implementation Plan B — Clean Architecture Adoption Strategy

**Reference:** *CleanArchitectureArchitectureUsedInSoftwareDevelopmentCompleteIntroductionandImplementationProcess.pdf*

An incremental, risk-aware alternative to a full Big Bang rewrite. Where the standard plan prescribes strict upfront layering, Plan B focuses on **gradual isolation of the domain** while keeping delivery velocity high.

---

## Core Principle

**Protect the domain first, then carve out the boundaries.**

Instead of building all four layers from day one, we identify the smallest slice of core business logic and wrap it with testable interfaces. Outer layers are migrated later, one adapter at a time.

```
Phase 1     [ Domain Core ]   ← fat service layer, no framework deps
Phase 2     [ Use Cases ]     ← orchestration extracted, repos as interfaces
Phase 3     [ Adapters ]      ← one adapter at a time (DB → UI → external)
Phase 4     [ Full Layers ]   ← all four Clean Architecture layers with verified boundaries
```

---

## Phase 1 — Isolate the Domain (Week 1–2)

**Goal:** Extract pure business logic into a zero-dependency domain module without changing any existing code paths.

### Steps

1. **Audit existing services** — grep for `import java.*`, `import org.springframework.*`, `import javax.persistence.*` inside every `*Service.java` or `*Domain*.java`. Any file with zero framework imports is already a domain candidate.
2. **Create a `domain/` package** — move pure POJOs, value objects, enums, and business-rule static methods here. No annotations, no extends, no implements from frameworks.
3. **Rewrite unit tests** — every domain class must have a passing test that does not touch Spring, Hibernate, or the filesystem.
4. **Gate with RICA** — configure `excludePatterns` to skip the `domain/` package from framework-layer checks; enable `enableDesignPatternChecks` to catch any leaking dependency back out.

### Deliverables

- `com/example/domain/` — zero framework imports, 100% test coverage on business rules
- CI gate: `mvn compile` + `mvn test` must pass without Spring context

---

## Phase 2 — Define Use Cases as Interfaces (Week 3–4)

**Goal:** Replace direct repository/Service calls in existing controllers with interface-based indirection, without changing controller logic yet.

### Steps

1. **Extract repository interfaces** — `UserRepository` as an interface in an `application/` package. Keep the existing JPA impl in `infrastructure/`.
2. **Extract service interfaces** — `UserService` as an interface. Move orchestration logic (the "what to do" not "how to do it") into an implementation class that depends only on domain and repository interfaces.
3. **Wire via constructor injection** — use `@RequiredArgsConstructor` on the impl classes. The framework now injects the impl, but the controller only sees the interface.
4. **Verify with RICA cross-file analysis** — run the full analyzer. Expect:
   - V401 (controller-bypass) to drop to zero because controller → repo is now controller → service interface → impl → repo interface → impl
   - V102/V103 (uninjected access) to stay green because all fields are constructor-injected

### Deliverables

- `com/example/application/port/in/*` — use-case input ports (service interfaces)
- `com/example/application/port/out/*` — output ports (repository interfaces)
- `com/example/application/service/*` — use-case implementations (no framework annotations except `@RequiredArgsConstructor` / `@Transactional`)
- Existing controllers unchanged — they keep calling the same method names, now on interfaces

---

## Phase 3 — Migrate One Adapter at a Time (Week 5–8)

**Goal:** Replace each concrete infrastructure dependency with a Clean-Architecture adapter, verifying backward compatibility after each swap.

### Priority Order

| Step | Adapter | Risk | Validation |
|------|---------|------|------------|
| 3a | **Database** — move JPA entities to `infrastructure/`, keep domain POJOs clean | Medium | All existing controller integration tests pass |
| 3b | **External HTTP** — wrap RestTemplate/WebClient behind a `PaymentGateway` interface | Low | Same response JSON before and after |
| 3c | **File I/O** — wrap `Files.readAllBytes` behind a `DocumentStore` interface | Low | File content matches byte-for-byte |
| 3d | **Messaging** — wrap Kafka/Rabbit behind a `EventPublisher` interface | Medium | Event count and ordering verified |
| 3e | **Caching** — replace static `ConcurrentHashMap` with `@Cacheable`-backed adapter | Low | Hit/miss ratio unchanged |

### Each Step Follows the Same Pattern

```
1. Define interface in application/port/out/
2. Create adapter class in infrastructure/adapter/ implementing it
3. Replace direct instantiation with constructor injection
4. Delete old references
5. Run RICA — expect zero new violations
6. Run full test suite
```

---

## Phase 4 — Full Layer Enforcement (Week 9–10)

**Goal:** Enforce the Dependency Rule mechanically, using RICA rules as a CI gate.

### Steps

1. **Package-tighten with RICA `package-violation` rules** — configure `excludePatterns` so only allowed cross-package references pass:
   - `domain` → nothing (zero deps)
   - `application` → `domain` only
   - `infrastructure` → `application`, `domain`
   - `presentation` → `application`, `domain`

2. **Add `@RestController` ban on infrastructure types** — RICA V110–V114 already flag HttpClient, File I/O, Thread, Cache, and SQL in controllers. Raise these to `severity: 'error'` in your project's RICA config.

3. **CI gate** — add `npm run rica:check` (or equivalent) to your build pipeline. Any violation with severity `error` fails the build.

---

## Comparison: Plan A vs Plan B

| Dimension | Plan A (Standard) | Plan B (Incremental) |
|-----------|-------------------|----------------------|
| **Start** | Build all layers upfront | Extract domain first, add layers later |
| **Delivery pause** | 4–6 weeks before first feature | No pause — features ship weekly |
| **Risk** | High — wrong boundaries discovered late | Low — each phase validated independently |
| **Team training** | Full bootcamp required | Learn by doing, one pattern at a time |
| **Legacy code** | Rewrite or exclude | Encapsulate behind interfaces, replace later |
| **RICA integration** | Reactive (fix violations after analysis) | Proactive (prevent violations during migration) |

---

## Success Criteria

- [ ] All domain classes pass `mvn test` without Spring context
- [ ] Zero `import javax.persistence.*` or `import org.springframework.*` in `domain/` or `application/port/`
- [ ] RICA V110–V114 count = 0 across all controllers
- [ ] CI pipeline fails on any `error`-severity architectural violation
- [ ] Each adapter swap completes without regression in the existing test suite
