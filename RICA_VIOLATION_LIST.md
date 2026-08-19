# RICA — Complete Violation Detection Rule List

**Definitive, source-verified list of all violation codes RICA can emit.**

Verified against `src/violationManager.ts`, `src/designPatternAnalyzer.ts`, `src/crossFileAnalyzer.ts`, `src/packageBoundaryDetector.ts`.

---

## Summary

| Metric | Count |
|---|---|
| Codes defined | **49** (V101–V104, V106–V114, V201–V207, V300–V321, V400–V404, V501, V000) |
| Codes with a live emitter | **46** (31 + V104, V109, V202, V203, V207, V308–V321) |
| Codes declared but never emitted (dead) | **0** |
| Fallback codes | **3** (V000, V300, V400) |
| Detectors | **7** |

> **V105 removed** — the old `package-violation` code was obsolete and is fully replaced by **RICA-V501** (emitted by `PackageBoundaryAnalyzer`).

---

## 1. Stage 1 — Layer-Specific Detectors

### ServiceLayerAnalyzer

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V101 | Self-Instantiation | `error` | Service does `new RepositoryImpl()` / `new Dao()` instead of DI | ✅ |
| V102 | Uninjected Repository Access | `error` | Service field/call targets a Repository type without injection | ✅ |
| V104 | Anemic Service | `warning` | Service has ≥2 concrete methods that are only accessors/pure delegation | ✅ |

### ControllerLayerAnalyzer

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V101 | Self-Instantiation | `error` | Controller `new`s a service/repository/infra class | ✅ |
| V103 | Uninjected Service Access | `error` | Controller field typed Service/Repo without injection | ✅ |
| V106 | Business Logic in Controller | `warning` | Logic score ≥ threshold (loops/conditionals/calculations) | ✅ |
| V110 | Direct HTTP Call | `error` | `HttpClient`, `RestTemplate`, `WebClient` in controller | ✅ |
| V111 | File I/O in Controller | `error` | `File`, `InputStream`, `Files`, `Path` in controller | ✅ |
| V112 | Background Thread | `warning` | `Thread`, `Executor`, `Future` in controller | ✅ |
| V113 | Static Cache | `warning` | `static` `HashMap`/`ConcurrentHashMap` with cache-like field name | ✅ |
| V114 | Raw SQL Access | `error` | `DataSource`, `JdbcTemplate`, `EntityManager` in controller | ✅ |

### EntityLayerAnalyzer

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V106 | Business Logic in Entity | `warning` | Entity method logic score ≥ threshold | ✅ |
| V107 | Direct Layer Access | `error` | Entity imports Service/Controller type | ✅ |
| V108 | Anemic Entity | `info` | Entity class has zero methods | ✅ |
| V109 | Improper Data Access | `error` | Entity field/method uses DB APIs directly (`JdbcTemplate`, `EntityManager`, JDBC, `DataSource`) | ✅ |

### APIResourceLayerAnalyzer

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V201 | Exposing Internal Entity | `warning` | Public controller method returns `@Entity` type (skips private) | ✅ |
| V202 | Missing DTO Usage | `warning` | Endpoint parameter type is an internal domain/entity class instead of a DTO (skips private) | ✅ |
| V203 | Improper Error Handling | `warning` | Endpoint throws a raw generic exception (`throws Exception`/`throw new Exception`), creates it, or calls `printStackTrace()` (skips private) | ✅ |
| V204 | Business Logic in Resource | `warning` | REST method logic score ≥ threshold | ✅ |
| V205 | Direct Service Instantiation | `error` | REST controller does `new ServiceImpl()` | ✅ |
| V206 | Missing Validation | `info` | Endpoint param missing `@Valid`/`@NotNull`/`@NotEmpty` (skips private) | ✅ |
| V207 | Exposing Internal Structure | `warning` | Endpoint returns a non-DTO internal project class instead of a DTO (entity returns → V201) | ✅ |

---

## 2. Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V401 | Controller Bypass | `error` | Controller → Repository directly (calls/has-a/uses) | ✅ |
| V402 | Cross-Layer Violation | `warning` | Service→Controller, Entity→Controller, Entity→Service, Repository→Controller, Repository→View | ✅ |
| V403 | Cyclic Dependency | `error` | Tarjan SCC cycle; also `INVERTED_DEP` (lower→higher layer) | ✅ |
| V404 | Entity Exposure | `warning` | Controller exposes Entity in return type/param/field | ✅ |
| V400 | *(fallback)* | — | Any unmapped graph ruleId → V400 | ⚠️ fallback |

---

## 3. Stage 3 — Package Boundary (PackageBoundaryAnalyzer)

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V501 | Package Boundary Violation | `error` | File in layer A imports type in layer B ∉ A.allowedDeps | ✅ |

Safeguards:
- `@Component`-only classes in controller packages are excluded from `presentation` layer
- Feign patterns (`**/feign/**`, `**/feignClient/**`) match `infrastructure` before `controller`

---

## 4. Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)

| Code | Name | Severity | Trigger | Emitted |
|---|---|---|---|---|
| V301 | Adapter Missing | `error` | Domain/application imports external SDK (AWS SDK, Kafka, Netty…) without adapter in infrastructure | ✅ |
| V302 | God Facade | `warning` | In-degree ≥8 AND LOC ≥500 AND ≥60% delegation methods | ✅ |
| V303 | Strategy Missing | `warning` | Service-layer: ≥4 if-else on same variable OR ≥4 switch-cases | ✅ |
| V304 | Factory Missing | `error` | Same concrete `new`ed from ≥3 callers AND implements interface (skips `*Builder*`) | ✅ |
| V305 | Mutable Singleton | `warning` | `static` non-`final` mutable collection field | ✅ |
| V306 | Raw Thread Spawn | `error` | `new Thread()` / `Executors.execute()` outside `@Configuration` | ✅ |
| V307 | Missing Abstraction | `warning` | Interface/abstract class with exactly 1 implementation | ✅ |
| V308 | Leaking Construction Logic | `warning` | Business method performs >N construction statements in one `new` OR construction contains branching (ternary) logic (skips builders/anonymous) | ✅ |
| V309 | Fat Interface (ISP) | `warning` | Project interface declares >N methods OR clients use <50% of declared methods (usage ratio) | ✅ |
| V310 | Missing Command Pattern | `warning` | Method sequences ≥2 persistence writes at cyclomatic ≥6 (skips `@Transactional`) | ✅ |
| V311 | Missing Prototype / Deep-Copy Smell | `warning` | Method contains ≥3 correlated copy pairs `a.setX(b.getX())` (distinct receivers, same resolved type) | ✅ |
| V312 | Fragmented Factories | `warning` | ≥2 classes each expose a single no-arg `create()` returning the same type (should centralize into one Abstract Factory) | ✅ |
| V313 | Missing Decorator | `warning` | Method performs cross-cutting concerns (logging `Logger.*` / `AuditLogService.*` / `TransactionTemplate.*` calls) interleaved with a domain operation | ✅ |
| V314 | Missing Composite | `warning` | Block with loop + nested `instanceof` type-checks on a common variable (should use Composite + polymorphism) | ✅ |
| V315 | Flyweight Missing | `warning` | Immutable value object (`*Money*`, `*Currency*`, `*Config*`, `*Setting*`) constructed inside a loop | ✅ |
| V316 | Scattered State Machine | `warning` | ≥3 classes each branch on the same enum status value (state logic scattered; should centralize in State pattern) | ✅ |
| V317 | Duplicate Algorithm | `warning` | 2+ methods share ≥50% call-sequence with the same slot types but different receiver types (template-method smell) | ✅ |
| V318 | Hardcoded Notifications | `warning` | Method directly invokes ≥3 notifier targets (email/SMS/push/AuditLog) instead of a single Observer-based publisher | ✅ |
| V319 | Monolithic Validation Pipeline | `warning` | Method contains ≥5 guard clauses (null/empty/negative) before the real logic (should use Chain of Responsibility) | ✅ |
| V320 | Service Locator | `warning` | `*Service`/`*Controller` outside `@Configuration` calls `getBean()` / `getService()` / service-locator lookup | ✅ |
| V321 | Excessive Defensive Null Checking | `warning` | Method has ≥3 decision points whose condition tests `null` (should use `Optional`/Null Object) | ✅ |
| V300 | *(fallback)* | — | Any unmapped design-pattern ruleType → V300 | ⚠️ fallback |

Safeguards:
- V304 skips class names containing `Builder` (Lombok)
- V306 skips `@Configuration` classes
- V303 restricted to `detectedLayer === 'service'`
- V308 skips `*Builder*` / `.withX()` cascades and anonymous `Thread`/`Runnable`; counts nested `new`/compound args and flags ternaries inside the construction
- V309 flags by declared-method count (>N) or usage ratio (<50% of declared methods actually referenced by clients); requires ≥4 declared methods for the ratio branch
- V310 exempts `@Transactional` methods
- V311 requires both receivers resolved to the same type and the setter/getter names to correlate (`getName`→`setName`, strip `get`/`set` prefixes)
- V312 only considers no-arg `create()`/typed factory methods; treats same-type per-factory as intentional dedup
- V313 ignores cross-cutting calls that are the only statement in a method (would be noise); counts `Logger.*`/`AuditLogService.*`/`TransactionTemplate.*`/`NotificationService`/`EmailService`/`SmsService` receivers
- V314 requires loop + nested `instanceof` on a shared variable; skips primitive/primitives wrappers
- V315 restricts to immutable value-object type names (`Money`, `Currency`, `Config`, `Setting` families)
- V316 requires ≥3 distinct classes branching on the same enum accessor (`getStatus()`/`getState()` → `.getValue()`); skips `switch`/`if` on same local variable (may be legitimate)
- V317 matches call sequences via `sequenceSimilarity` (LCS-based, threshold 0.8); requires differing receiver types to avoid flagging identical straight-line wrappers
- V318 counts distinct public notifier method targets; takes max per method
- V319 counts guard clauses among decision points; skips `@Configuration` classes
- V320 skips classes annotated `@Configuration` and code-behind `getBean` calls on the DI container
- V321 counts decision points whose condition tests `null`; skips `null` checks <3

---

## 5. Severity Distribution

| Severity | Codes |
|---|---|
| **error** | V101, V102, V103, V110, V111, V114, V107, V109, V205, V301, V304, V306, V401, V403, V501 |
| **warning** | V104, V106, V112, V113, V108†, V201, V202, V203, V204, V207, V302, V303, V305, V307, V308, V309, V310, V311, V312, V313, V314, V315, V316, V317, V318, V319, V320, V321, V402, V404 |
| **info** | V108‡, V206 |

† V108 is `info` in EntityLayerDetector
‡ V108 as emitted by EntityLayerDetector is `info`

---

## 6. Trigger Example Code Snippets (for screenshots)

| Rule | Minimal trigger |
|---|---|
| V101 | `public void save() { UserRepository repo = new UserRepository(); }` in a Service |
| V104 | `@Service` class with ≥2 methods that only delegate: `public String a() { return repo.a(); }` |
| V109 | `EntityManager em; em.persist(...)` or `new JdbcTemplate()` inside an `@Entity` |
| V110 | `RestTemplate rt = new RestTemplate(); rt.getForObject(url, String.class);` in a Controller |
| V113 | `static Map<String,String> cache = new HashMap<>();` in a Controller |
| V114 | `JdbcTemplate jt; jt.query(...)` in a Controller |
| V206 | `@GetMapping public String get(@RequestParam String id)` — no `@Valid`/`@NotNull` |
| V202 | `public String create(@RequestBody Order order)` where `Order` is an internal/entity class |
| V207 | `public Invoice getInvoice(String id)` — `Invoice` is a non-DTO project model |
| V301 | `import software.amazon.awssdk.services.s3.S3Client;` in `domain/` |
| V303 | Service method with `if (type == A)… else if (type == B)… else if (type == C)… else if (type == D)` |
| V304 | Same class `new`ed from 3 different service classes |
| V305 | `public static List<String> items = new ArrayList<>();` |
| V306 | `new Thread(() -> {}).start();` outside `@Configuration` |
| V307 | `interface PaymentGateway {}` with only one impl class |
| V308 | `return new Order(new Address("x", 10, new City("NY", 10001)), new Customer(...));` in a business method |
| V308b | `return flags.get("x") ? new FastConnector(...) : new SlowConnector(...);` — branch inside a construction |
| V309 | `interface AllInOne {` with 12 unrelated methods |
| V309b | `interface PaymentWriter {` with 5 methods where clients call only 1 (usage ratio <50%) |
| V310 | Complex service method that calls `repo.save()`, `repo.deleteById()` in sequence without `@Transactional` |
| V311 | `Order to = new Order(); to.setId(from.getId()); to.setName(from.getName()); to.setQty(from.getQty());` (≥3 pairs) |
| V312 | `SqlOrderFactory.create()` + `MongoOrderFactory.create()` each returning `Order` |
| V313 | `logger.info("start"); repo.save(o); logger.info("end");` inside one service method |
| V314 | `for (...) { if (node instanceof Folder) { if (child instanceof FileItem) { … } } }` |
| V315 | `for (Row r : rows) { Money m = new Money(r.amount, "USD"); }` |
| V316 | 3 classes each doing `if (o.getStatus() == PENDING)` |
| V317 | Two report classes with identical `open(); header(); body(); footer(); close();` call sequence on different writer types |
| V318 | Method calling `emailService.send(o)`, `smsService.send(o)`, `auditLogService.record(o)` |
| V319 | `validate(Order)` with 5+ `if (x == null) throw …` guard clauses |
| V320 | `OrderRepository r = ctx.getBean(OrderRepository.class);` outside `@Configuration` |
| V321 | Method with 3+ `if (o.user.name == null)` style null checks |
| V401 | Controller injects `UserRepository` and calls `.findById()` |
| V501 | `application/OrderService.java` does `import com.foo.presentation.UserController;` |
| V403 | `A depends on B, B depends on C, C depends on A` |

---

## 7. Verification Command

Run this to re-derive the full code list from source:

```powershell
cd rica-developerui
Select-String -Pattern "RICA-V\d{3}" -Path src\violationManager.ts, src\designPatternAnalyzer.ts, src\crossFileAnalyzer.ts, src\packageBoundaryDetector.ts |
  ForEach-Object { ([regex]::Matches($_.Line, "RICA-V\d{3}")).Value } | Sort-Object -Unique
```
