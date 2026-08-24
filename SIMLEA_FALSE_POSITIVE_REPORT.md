# Simlea False-Positive Report — RICA Deterministic Engine (757 files)

**Date:** 2026-05-13  
**Target:** `E:\DevMyX\Simlea Web\backend` (9 modules, 757 `.java`, 267 Service / 67 Controller / 135 Entity / 101 Repo)  
**Engine:** `rica-developerui` `java-parser@2.2.0` Chevrotain CST → `FullASTOutput`, no AI. Sample `120 files` + full `RICA_STATUS.md:198` `381 single-file (58 err/11 warn/312 info) + 80 cross-file = 461`.  
**Method:** Direct `src/*Detector.ts` + `dependencyGraph.ts` + `violationCatalog.ts` heuristics vs Simlea conventions (`com.simlea.*`, Lombok, Spring Boot, MapStruct-style mappers, `@ControllerAdvice`). `undefined:193` in sample = legacy `business-logic` etc mapped only in `violationManager.ts:41 RULE_CODE_MAP`.

---

## 1. Taxonomy Mismatch (Biggest Systemic FP)

**Root:** `src/infrastructure/javaParser.ts:3610 classifyClass` (annotation 1.0 > name 0.8 > package 0.7) vs `analyzerConfig.ts:50 DEFAULT_LAYER_BOUNDARIES` (`**/domain/**,**/entity/**` etc). Simlea uses `com.simlea.model`, `com.simlea.dto`, `com.simlea.config`, `com.simlea.controller.feignClient`.

| Simlea Package | Files | Boundary Match? | `detectedLayer` | FP Consequence |
|---|---|---|---|---|
| `com.simlea.model` (BaseEntity, Tenant, Event) 117+ | `domain` `**/domain/**` **no** | `@Entity` → `entity` (ok) but no V501 boundary | V501 never fires for model; `@Component JwtUtils` in `auth` → `service` |
| `com.simlea.config` 90 (`CoreEntityManagerConfig`, `TenantFilter extends OncePerRequestFilter`) | `infrastructure` `**/config/**` → yes, but `@Component` on filter → `service` | Filter misclassed → V303 strategy false | `TenantFilter:78 extractTenantId` 5 if-else flagged V303 |
| `common-lib` `com.simlea.dto` `ApiResponse<T>`, `LoginRequest` | `domain **/dto/**` → yes (`ApiResponse` matches `*Response` DTO suffix `apiResource:33 isDTOClassName`) | Correct, but `BaseEntity @MappedSuperclass` not `@Entity` → name `*Entity` still `entity` | Anemic V108 on DTOs if moved to model |
| `controller.feignClient` 19 (`@FeignClient`) | `**/feignClient/**` → `infrastructure` prioritized over `controller` (`RICA_STATUS:53`) | Works, but `com.simlea.client.NotificationClient` not glob → `controller` false | V401 bypass false |

**Fix:** Expose `.ricarc` / `package.json:javaAstAnalyzer.layerBoundaries` already exists — add `**/model/**` to `domain`, `**/common-lib/**` to `excludePatterns`, whitelist `*Filter/*Config` from `service` (see §4).

---

## 2. Business Logic Score `3919` — Classic Heuristic Trap

```ts
// 3919: score = count(if|for|while|switch|&&| |||==|!=|<=|>=|++|--) +1 LOC>10 +2 LOC>20 +2 cyclomatic>3; threshold 3
// consumers: controller:325 V106, apiResource:154 V204, entity:203 V106
```

**FP:** Counts defensive `if(token!=null)`, `if(o==null) return`, `&& isSecure` as domain logic.

| Sample Flag | Code | Why FP |
|---|---|---|
| `AuthController:1 login` score 4 `if(token!=null)&&isSecure` | V106 | Cookie null-guard, not business |
| `AuthController:3 refreshToken` score 8 | V106 | Token validation chain — borderline but auth logic arguably service, still noisy at 3 |
| `OrderEntity.calc` loop `for(i<10) if(i%2)` | V106 entity | Intentional heavy calc for demo — but Lombok `@Data` DTOs with no loops still hit `==null` |

**Proposed Fix (§3):** Weight `0` for guard clauses; only +1 for domain ops (arithmetic `+=` on `BigDecimal`, cross-entity `repo.save`, deep nesting `>2`). Raise threshold `3→6` for Simlea in interim (`RICA_STATUS.md:312`).

---

## 3. Rule-Specific False Positives

### Layer V101-V114

| Code | Heuristic | Simlea FP | Lines / Safeguard | Patch |
|---|---|---|---|---|
| V101 self-instantiation | `new Repo/Service` in service `serviceLayer:120` | None — Lombok `@RequiredArgsConstructor` correctly marked `isInjected:1199` | OK | Keep |
| V102/V103 uninjected `isInjected` `1305` Lombok final field via `@RequiredArgsConstructor` | Legacy field `@Autowired` still flagged? No, `@Autowired/@Inject` handled `1132`. Field injection still tolerated — no FP | OK | Keep |
| V104 anemic-service `isTrivial:271` `score==0&&LOC<=5` | `TenantDataSourceRouter` (DataSource router, delegation only) flagged anemic — but it's infra router not business service | Misclass `*Router→service` | Exempt `*Router/*DataSource*` or `!service` layer |
| V108 anemic-entity `entity:203` `>80% getters` | `ApiResponse<T>`, `LoginRequest @Data` in `common-lib` counted if `detectedLayer=entity` via `*Entity` name; 312 `info` in full scan | DTO misclass | Filter `isDTOClassName` or `!@Entity` |
| V110 direct HTTP `controller:34` 18 types, std-lib filter `134` `org.springframework.` excluded → misses `RestTemplate` | `WcEventService` (`@Service` with `WebClient`) correctly **not** flagged (service exempt) — no FP | OK | Keep std-lib exclusion |
| **V111 file I/O** `controller:41` 26 types | `FileStorageController:32 Files.probeContentType(file.getFile().toPath())` — thin wrapper, flagged `File I/O in Controller` error | Should be service, but content-type sniff is legit controller thin wrapper | Allowlist `probeContentType/getFile` or check `Files` only with `write/readAllBytes` |
| V112 thread | `Timer/Executor` in controller | `TaskSchedulerConfig @Configuration` correctly exempt `designPattern:159` | OK |
| V206 missing validation `apiResource:259` `private` skip `104` else `!@Valid/@NotNull` | `A118` in sample: every `@RequestParam String id` flagged — class has `@Validated` not checked | **Major FP** | Traverse to class `has @Validated/@RequestParam(required=false)` — §4 |
| V203 error handling `280` `throws Exception/printStackTrace` | `AuthController` throws `BadCredentialsException` typed → not flagged (correct); `StatisticsService` generic `throws Exception` would FP but not in sample | OK |

### Cross-File V401-V404, V501

| Code | Simlea Case | FP? |
|---|---|---|
| V401 controller→repository direct `dependencyGraph:619` | `AuthController → UserRepository` direct if exists → **true positive** (Simlea does via service) | No FP observed |
| V402 service→controller `766` | `OrderService → OrderController` demo file only | No FP |
| V403 cycle Tarjan `226` | `OrderService ↔ PaymentService` demo cycle; Simlea `TenantDataSourceRouter` cycle not real | No FP — `4×V403` in sample demo only |
| V501 `packageBoundaryDetector:37` `matchLayerByFqn` via `fullyQualifiedName` → `DEFAULT_LAYER_BOUNDARIES` | `model→unknown` never triggers, so many cross-layer missed — FP *negative* (miss) | Add `**/model/**` |

### Design Pattern V301-V323

| Code | Heuristic | Simlea FP |
|---|---|---|
| V301 adapter `285` `awssdk,kafka,netty` `hasAdapterFor:322 any infra interface→true` | `S3Client` in `domain` without adapter would flag, but `StripeGateway implements PaymentGateway` makes `hasAdapterFor` true for *all* SDKs → suppressed → **miss** | Fix to substring match `sdkSimple` |
| V303 strategy `429` `service only ≥4 if-else same var` | `TenantFilter:78` 5 branches in `config` misclassed as `service` → FP | Exempt `*Filter/*Extractor` |
| V308 leaking construction `478` `>5 stmts or ternary` | `new Order(fast?new A():new B())` flagged even under limit 50 — by spec; `builder().withA()` correctly skipped | OK |
| V309 fat interface `531` `>10 methods or used<50%` | `BaseService` 12 methods correctly flagged; `OrderPort` 1 used flagged via ratio — intentional but warning | Tune `fatInterfaceMethodLimit 10→12` |
| V313 decorator `702` `Logger|Metrics` interleaved `limit 2` | `logger.info+repo.save+logger.info` flagged correctly; startup logs not interleaved → not flagged | OK |
| V315 flyweight `753` `insideLoop` any type | `new ApiOrderDto()` per row in loop would be flagged — **FP** for DTO mapping (intentional per-iteration allocation) | Restrict to `*Money/*Currency/*Config` per `RICA_VIOLATION_LIST:135` |
| V322 proxy `986` `DataSource,EntityManager,Socket,RestTemplate` `!infrastructure` | `WcEventService` (`service`) `WebClient` flagged — **FP** (`WebClient` is reactive proxy bean, injected via `@Bean`) | Allow `isInjected` or `receiverIsInjected` |
| V311 copy `311` `set(get())` dense | MapStruct-style mappers in `common-lib` dense `set(get)` would flag V311 — **FP** for mapping layer | Exempt `*Mapper/*Converter` or method name `*map*` |
| V104/V112/V203 Lombok | `@Data` DTO 0 methods → V108, `@Builder` handled `DESIGN:54` skipped for V308, `@RequiredArgsConstructor` handled `1199` — no FP | OK |

---

## 4. Mitigations Applied / Proposed

### Applied 2026-05-13 — Patches Landed (Post-Report)

- **Semantic weighting `javaParser.ts:3919`**: `==null/!=null` and `if(...null...) return/throw` guard clauses now weight `0`; `&&`/`||` null-guards discounted. `AuthController login score 4→1` (V106 suppressed).
- **Suppression `javaParser.ts:extractSuppressedLines` + `violationManager.ts:439 isSuppressed`**: `// rica-disable-next-line RICA-V111` (±5 lines window) and `@SuppressWarnings("rica:V111"/"rica:all")` (bare annotation treated as suppress-all due to empty elements). Tested via `test-suppression.js` → `0 violations` (both paths).
- **V206 `@Validated` `apiResourceLayerDetector.ts:238`**: Class-level `@Validated`/`@Valid` skips V206 — eliminates `A118` (`@RequestParam String id` at class `@Validated`) massive noise.
- **V111 allowlist `controllerLayerDetector.ts:186`**: `probeContentType/getFile/toPath/getOriginalFilename` excluded — `FileStorageController:32` no longer FP.
- **Spring adapter `javaParser.ts:3622 classifyClass`**: `@FeignClient→infrastructure`, `@ControllerAdvice/RestControllerAdvice→config`, `@Component+Filter→infrastructure`; `domain` boundary `analyzerConfig.ts:50` `**/model/**` added (and `package.json` domain `**/model/**,**/dto/**,**/enum/**`).
- `docs/violations/RICA-V322.md,RICA-V323.md` regenerated `scripts/generate-docs.cjs` → `38 files`, `npm run docs:verify` sync, `npm test 139 passing`.
- `test-projects/rica-clean` fixed: `Order.java` score<3, `OrderController.handleBadRequest` private.
- `scripts/verify-test-projects.js` still `rica-clean 0 / heavy 40+ / structural 28` (heavy DP still 4, but V106 count drops on Simlea sample: `C40→~12` after weighting).

### Already Applied (this report) — Initial

### Proposed Patches (§2 Educated Guesses)

**A. Context-Aware Suppression (Crucial DX)**  
Add `src/infrastructure/javaParser.ts:extractSuppressedCodes` checking `// rica-disable-next-line V111` (line comment) and `class/method/field` `@SuppressWarnings("rica:V111")` / `"rica:all"` (already parsed as `isBuiltIn` `2673`). Filter in `violationManager.filterByConfig` or per-detector `isSuppressed(node, code)`. Escape hatch for `FileStorageController.probeContentType`.

**B. Semantic Weighting**  
Rewrite `calculateBusinessLogicScore:3919` to `weight 0` for `==null/!=null`, `&& isSecure`, `if(x==null) return` guard clauses (detect `null` in condition). Only +1 for `total.multiply`, `repo.save`, `status==PENDING` cross-entity state, `for` nesting `>1`.

**C. Spring Adapter Module**  
Separate `src/infrastructure/springAdapter.ts` understanding: `@RestController→@ResponseBody`, `@Validated` on class applies to all `@RequestParam`, `@FeignClient` as `infrastructure` port (already glob, but also annotation), `@ControllerAdvice` global error handling → exempt V203 if `*Advice` exists, Lombok `@Builder/@Data` already handled but extend to `@NoArgsConstructor` DTO detection.

**D. Config Fix**
```json
{ "businessLogicThreshold": 6, "fatInterfaceMethodLimit": 12, "crossCuttingCallLimit": 3, "excludePatterns": ["**/common-lib/**","**/Target/**"], "layerBoundaries": { "domain": { "packages": ["**/domain/**","**/entity/**","**/model/**","**/dto/**"] } } }
```

---

## 5. Verification

```powershell
cd rica-developerui
npm test # 139 passing
node scripts/verify-test-projects.js # as above
npm run generate:docs; npm run docs:verify
npm run docs:dev # http://localhost:5173/violations/RICA-V322.html
```

Open any `test-projects/<proj>` as workspace → `Java AST: Analyze Full Project` → `Violations Webview` or `http://localhost:8082/view` D3 graph.

> Full `757`-file drift run pending: `node test-simlea-analyzer.js` (D:\RICA\Project\Library_Management_System-main vs Simlea) — `SIMLEA_FALSE_POSITIVE_REPORT.md` is pre-register for final defense patching.
