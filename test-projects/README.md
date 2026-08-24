# RICA Test Projects — 3-Project Coverage Suite (AI Ignored, Deterministic Only)

Created: 2026-05-13 — Pure Java/Maven projects for deterministic rule validation (V101–V323, V401–V404, V501). No AI/LLM involved.

## Projects

### 1. `rica-clean` — 0 Violations (Reference)
**7 files** — Hexagonal/Clean Architecture exemplar.

| Layer | Files | Key Design |
|---|---|---|
| domain | `Order.java` (rich behavior, `businessLogicScore<3`), `OrderPort.java` (interface) | Entity has 3 simple behavior methods, Port+Adapter |
| application | `OrderService.java` (constructor injection, `@Transactional`) | Service owns business logic |
| infrastructure | `OrderAdapter.java` (`@Repository implements OrderPort`) | No SDK leak |
| presentation | `OrderController.java` (thin, `OrderRequest` `@Valid`/`@NotNull`, `OrderResponse` DTO, private `@ExceptionHandler`) | No V106/V110/V201 |

**Verify:**
```powershell
cd test-projects/rica-clean
# In VS Code: open folder → `Java AST: Analyze Current File` → Problems panel should show 0 RICA diagnostics
# CLI: node ../rica-developerui/verify-projects.js  → rica-clean ByCode: {}
```

### 2. `rica-violations-heavy` — 40+ Violations (Layer + Graph)
**6 files** — Intentionally violates every layer rule to test `Stage1-3`.

| File | Triggers |
|---|---|
| `entity/OrderEntity.java` | V108 anemic (getters/setters), V109 `JdbcTemplate` in entity, V107 `OrderService` field, V106 score≥3 loop |
| `service/OrderService.java` | V102 uninjected `OrderRepository`, V101 `new OrderRepository()`, V104 anemic (2 delegating methods), V402/V501 `import controller.OrderController` |
| `service/PaymentService.java` | V403 cyclic → `OrderService ↔ PaymentService` |
| `repository/OrderRepository.java` | — (clean, used for bypass) |
| `controller/OrderController.java` | V103 uninjected service, V101 `new OrderService()`, V106 loop, V110 `RestTemplate`, V111 `File`, V112 `new Thread()`, V113 static `Map cache`, V114 `DataSource`, V201/V404 `OrderEntity` return, V202 `OrderEntity` param, V203 `throw new Exception`+`printStackTrace`, V204 discount logic, V205 `new OrderService()`, V206 missing `@Valid`, V207 `getService()` returns internal type, V401 `OrderRepository` direct, V322 `RestTemplate`/`DataSource` proxy |

**Expected counts (via verify-projects.js):** `Layer S5 C15 E5 A19`, `DP 4`, `CF 11` (V401×2 V402×3 V403×4 V404×2), `PB 4` (service→controller).

### 3. `rica-structural` — 28 Structural Violations (V301–V323)
**30 files** — Mirrors `designPattern.test.js` fixtures to hit every `DesignPatternAnalyzer` rule.

| Code | File | Trigger |
|---|---|---|
| V303 | `application/PricingService.java` | 4 `if-else` on `type` |
| V305 | `application/MutableRegistry.java` | `static Map config` |
| V306 | `application/ThreadService.java` | `new Thread()` |
| V307 | `domain/PaymentGateway`+`infrastructure/StripeGateway` | 1 impl |
| V308 | `application/ConstructionService.java` | ternary inside `new Order` |
| V309 | `domain/FatInterface.java` | 12 methods |
| V310 | `application/CommandService.java` | 2 writes + cyclomatic≥6 |
| V311 | `application/CopyService.java` | 3 `setX(getX())` pairs |
| V312 | `SqlOrderFactory`+`MongoOrderFactory` | fragmented factories |
| V313 | `application/DecoratedService.java` | `logger.info` interleaved |
| V314 | `application/TreeWalker.java` | `for`+2 `instanceof` |
| V315 | `application/ReportService.java` | `new Money()` in loop |
| V316 | `state/One,Two,Three.java` | 3× `getStatus()==PENDING` |
| V317 | `application/XmlReport`+`CsvReport` | LCS ≥0.8 |
| V318 | `application/NotifierService.java` | 3 notifiers |
| V319 | `application/ValidatorService.java` | 5 guards |
| V320 | `application/LocatorService.java` | `ctx.getBean()` |
| V321 | `application/NullService.java` | 3 `==null` checks |
| V322 | `application/ProxyService.java` | `new DataSource()` + `RestTemplate` |
| V323 | `bridge/Shape`+`RedSquare/BlueSquare/RedCircle/BlueCircle` | 2×2 combinatorial |

**Note:** V301 (Adapter) suppressed when any `infrastructure/*` implements interface (current `StripeGateway`); move `StripeGateway` out to surface V301. V302 God Facade requires `inDegree≥8 + LOC≥500` graph — not triggered in isolated suite (needs 8 dependents).

## Running

```powershell
# From rica-developerui
npm test                                      # 139 passing (includes V322/V323)
node scripts/verify-test-projects.js          # prints by-code breakdown above
npm run rica:check                            # self-check
```

Open any `test-projects/<proj>` folder in VS Code → `Java AST: Analyze Full Project` → see Problems panel / Violations webview / Browser dashboard (`http://localhost:8082/view`).

## Benchmark Note (Non-AI)
- No LLM prompt pipeline executed; all violations deterministic via `java-parser` CST.
- Incremental edit latency: 350ms typing debounce, 0ms onSave (see `fileWatcher.ts:168`).
- Full scan duration logged as `Analyzed N files (M nodes) in Dms` (`astManager.ts:112`).
- No formal 1k/10k/100k LOC matrix yet — use these 3 projects (7–30 files) as seed for scaling tests.
