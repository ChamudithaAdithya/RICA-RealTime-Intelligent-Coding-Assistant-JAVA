"use strict";
/**
 * RICA Violation Catalog — single source of truth for all violation documentation.
 *
 * Every code the analyzers can emit is documented here: severity, trigger, rationale,
 * fix steps, before/after examples, the config toggle that controls it, and a source
 * reference. The documentation site under /docs is generated from this file, and the
 * extension derives per-violation documentation links from it, so the docs can never
 * drift from the analyzers.
 *
 * This module is data-only (no analyzer imports) so that:
 *   - the extension can import it freely,
 *   - VitePress can import it directly, and
 *   - scripts/generate-docs.cjs can load it via transpileModule at build time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIOLATION_DOC_BY_CODE = exports.VIOLATION_CATALOG = void 0;
exports.violationDocSlug = violationDocSlug;
const CATALOG_BY_CODE = {};
function d(entry) {
    CATALOG_BY_CODE[entry.code] = entry;
    return entry;
}
// ─── Stage 1 — Layer-Specific Detectors ───────────────────────────────────
const STAGE1 = 'Stage 1 — Layer-Specific Detectors';
d({
    code: 'RICA-V101',
    name: 'Self-Instantiation',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ServiceLayer',
    detector: 'ServiceLayerAnalyzer',
    layer: 'service / controller',
    trigger: 'A Service or Controller method uses `new` to construct a Repository, DAO, concrete ServiceImpl, or infrastructure class directly, instead of receiving it through dependency injection.',
    whyItMatters: 'Directly instantiating collaborators bypasses the DI container. The class is hard-wired to a concrete implementation and a lifecycle it does not own, which couples layers together and makes unit testing (mocking the collaborator) impossible. The container should decide construction so the class stays decoupled, testable, and replaceable.',
    howToFix: [
        'Remove the `new` statement.',
        'Add a field of the collaborator type to the class.',
        'Annotate it with `@Autowired`, `@Inject`, or `@Resource`, or pass it through the constructor.',
        'Keep the container responsible for wiring.',
    ],
    beforeCode: `// In a Service
public String lookup(long id) {
    UserRepository repo = new UserRepository();
    return repo.findById(id);
}`,
    afterCode: `// In a Service — inject instead
@Autowired
private UserRepository userRepository;

public String lookup(long id) {
    return userRepository.findById(id);
}`,
    mitigationHint: 'Use dependency injection (@Autowired/@Inject) instead of directly instantiating with new()',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V102', 'RICA-V103', 'RICA-V205'],
    sourceRef: 'src/serviceLayerDetector.ts:120',
    tags: ['di', 'instantiation', 'service', 'controller'],
});
d({
    code: 'RICA-V102',
    name: 'Uninjected Repository Access',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ServiceLayer',
    detector: 'ServiceLayerAnalyzer',
    layer: 'service',
    trigger: 'A Service declares a repository-type field (Repository/DAO) without an injection annotation, or a Service method calls a repository through a reference that was not injected.',
    whyItMatters: 'A repository field with no injection annotation is either a null pointer waiting to happen or a manual wire-up that hides the dependency. Without the container supplying the repository, the service is bound to a specific construction path and cannot be given a mock or alternative implementation in tests.',
    howToFix: [
        'Annotate a repository field with `@Autowired`, `@Inject`, or `@Resource`.',
        'Or inject it through the constructor.',
        'Prefer constructor injection for immutable, explicit dependencies.',
    ],
    beforeCode: `@Service
public class OrderService {
    private JdbcOrderRepository orderRepository; // no @Autowired

    public void charge() {
        orderRepository.deduct(); // NPE at runtime
    }
}`,
    afterCode: `@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public void charge() {
        orderRepository.deduct();
    }
}`,
    mitigationHint: 'Annotate the field with @Autowired or use constructor injection',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V101', 'RICA-V103'],
    sourceRef: 'src/serviceLayerDetector.ts:44',
    tags: ['di', 'repository', 'service'],
});
d({
    code: 'RICA-V103',
    name: 'Uninjected Service Access',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer',
    layer: 'controller',
    trigger: 'A Controller has a service or repository field without an injection annotation, or a Controller method calls a service/repository (and some infrastructure clients) through an uninjected reference.',
    whyItMatters: 'Controllers are thin HTTP adapters. When they reach for services through uninjected fields or method-local references, they lose the benefits of the container — testability, lifecycle management, and the ability to swap in fakes. The wiring belongs to the container; the controller should only orchestrate HTTP concerns.',
    howToFix: [
        'Add `@Autowired`/`@Inject` to the service or repository field, or use constructor injection.',
        'Call services only through injected fields/parameters.',
    ],
    beforeCode: `@RestController
public class OrderController {
    private OrderService orderService; // not injected

    @PostMapping("/orders")
    public void create(@RequestBody OrderRequest req) {
        orderService.create(req);
    }
}`,
    afterCode: `@RestController
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/orders")
    public void create(@RequestBody OrderRequest req) {
        orderService.create(req);
    }
}`,
    mitigationHint: 'Annotate the field with @Autowired or use constructor injection',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V101', 'RICA-V102'],
    sourceRef: 'src/controllerLayerDetector.ts:116',
    tags: ['di', 'controller', 'service'],
});
d({
    code: 'RICA-V104',
    name: 'Anemic Service',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ServiceLayer',
    detector: 'ServiceLayerAnalyzer',
    layer: 'service',
    trigger: 'A `@Service` class has zero concrete methods, or has at least two concrete methods where every one of them is only an accessor or a trivial pass-through delegation with no business logic, no branching, and no meaningful body.',
    whyItMatters: 'Services are the natural home for business rules: validation, calculations, orchestration, and state transitions. When a service is nothing but getters and delegation, that logic has leaked into controllers, entities, or helpers — making it untestable in isolation and harder to reason about. RICA flags it so behavior can be pulled back into the layer that owns it.',
    howToFix: [
        'Move validation, calculation, and orchestration logic from controllers/entities into the service.',
        'Give the service at least one method that embodies a business rule (beyond a single call-through).',
        'If the class genuinely has no behavior, reconsider whether it should be a service at all.',
    ],
    beforeCode: `@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) { this.repo = repo; }

    public List<Order> findAll() { return repo.findAll(); }
    public Order findById(long id) { return repo.findById(id); }
}`,
    afterCode: `@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) { this.repo = repo; }

    public List<Order> findAll() { return repo.findAll(); }

    public void place(Order order) {
        order.assertValid();
        if (!order.isBelowLimit()) {
            throw new OrderLimitException("over limit");
        }
        repo.save(order);
    }
}`,
    mitigationHint: 'Move business logic from controllers/entities into this service class',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V106', 'RICA-V108'],
    sourceRef: 'src/serviceLayerDetector.ts:141',
    tags: ['anemic', 'service', 'business-logic'],
});
d({
    code: 'RICA-V106',
    name: 'Business Logic in the Wrong Layer',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer / EntityLayerAnalyzer',
    layer: 'controller / entity',
    trigger: 'A Controller or Entity method has a business-logic score at or above the configured threshold (default 3). The score grows with the number of loops, conditionals, comparisons, and data-manipulation operators in the method body.',
    whyItMatters: 'Controllers should only orchestrate HTTP concerns (parse input, call services, shape responses) and entities should only guard their own invariants. Complex decision-making and data manipulation in these layers makes the logic untestable without HTTP/persistence infrastructure and scatters business rules away from the service layer where they belong.',
    howToFix: [
        'Extract the branches/loops/calculations into a service method.',
        'Call that service from the controller/entity.',
        'Keep the controller and entity thin enough that their bodies are mostly delegation.',
    ],
    beforeCode: `@RestController
public class OrderController {
    @PostMapping("/orders/apply")
    public double apply(@RequestBody Order order) {
        double total = 0;
        for (Item i : order.getItems()) {
            if (i.isDiscounted()) { total += i.getPrice() * 0.9; }
            else { total += i.getPrice() * i.getQty(); }
        }
        if (total > 1000) total -= 50;
        return total;
    }
}`,
    afterCode: `@RestController
public class OrderController {
    private final OrderService orderService;

    @PostMapping("/orders/apply")
    public double apply(@RequestBody OrderRequest req) {
        return orderService.calculateTotal(req.toOrder());
    }
}`,
    mitigationHint: 'Business logic should be in the Service layer, not in Controllers or Entities',
    configKey: 'enableBusinessLogicChecks',
    relatedRules: ['RICA-V104', 'RICA-V204'],
    sourceRef: 'src/controllerLayerDetector.ts:347',
    tags: ['business-logic', 'controller', 'entity'],
});
d({
    code: 'RICA-V107',
    name: 'Direct Layer Access',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'EntityLayer',
    detector: 'EntityLayerAnalyzer',
    layer: 'entity',
    trigger: 'An Entity holds a field, calls a method, or instantiates a service, repository, or infrastructure class directly.',
    whyItMatters: 'Entities are the innermost domain layer; they must not know about services, repositories, or infrastructure. Such references are not persisted, break serialization, and tangle the domain with upper layers so entities can no longer be reused across data sources or tested without bootstrapping the whole application.',
    howToFix: [
        'Remove service/repository/infrastructure fields and calls from the entity.',
        'Have the service layer coordinate domain objects and perform data access.',
        'If the entity needs derived data, compute it in the service and pass it in.',
    ],
    beforeCode: `@Entity
public class User {
    @Autowired private AuditService auditService; // wrong layer

    public void disable() {
        auditService.log("disabled"); // entity reaches up
        this.enabled = false;
    }
}`,
    afterCode: `@Entity
public class User {
    private boolean enabled = true;

    public void disable() { this.enabled = false; }
}

// Service layer owns the audit call
@Transactional
public void disableUser(long id) {
    User user = userRepository.findById(id);
    user.disable();
    auditService.log("disabled " + id);
}`,
    mitigationHint: 'Access external layers through the Service layer instead of directly',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V401', 'RICA-V402'],
    sourceRef: 'src/entityLayerDetector.ts:85',
    tags: ['layering', 'entity', 'dependency-rule'],
});
d({
    code: 'RICA-V108',
    name: 'Anemic Entity',
    severity: 'info',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'EntityLayer',
    detector: 'EntityLayerAnalyzer',
    layer: 'entity',
    trigger: 'An entity has zero methods, or more than 80% of its methods are plain getters/setters with no behavior.',
    whyItMatters: 'A class with no behavior captures no business contract — it is just a dumb data holder. In domain-driven designs, entities should encapsulate invariants and rules (they tell you what the domain concept *does*). RICA reports this at `info` level because anemic entities are sometimes an intentional, acceptable trade-off.',
    howToFix: [
        "Identify business rules that operate on the entity's own state.",
        'Move them onto the entity as behavior methods.',
        'If the entity genuinely is a pure data holder, verify this is intentional and rely on services for behavior.',
    ],
    beforeCode: `@Entity
public class Account {
    private BigDecimal balance;

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}`,
    afterCode: `@Entity
public class Account {
    private BigDecimal balance;

    public void deposit(BigDecimal amount) {
        this.balance = this.balance.add(amount);
    }

    public boolean canWithdraw(BigDecimal amount) {
        return this.balance.compareTo(amount) >= 0;
    }
}`,
    mitigationHint: 'Add behavior (methods) to the entity instead of keeping it as a pure data holder',
    configKey: 'enableBusinessLogicChecks',
    relatedRules: ['RICA-V104'],
    sourceRef: 'src/entityLayerDetector.ts:246',
    tags: ['anemic', 'entity', 'ddd'],
});
d({
    code: 'RICA-V109',
    name: 'Improper Data Access',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'EntityLayer',
    detector: 'EntityLayerAnalyzer',
    layer: 'entity',
    trigger: 'An Entity holds a field of a database type (JdbcTemplate, EntityManager, DataSource, JDBC types, Hibernate/ORM types), calls a database API, or constructs a database access object.',
    whyItMatters: 'Entities must not manage persistence. Embedding JDBC/JPA access in an entity couples the domain object to a specific storage technology, breaks portability across data sources, and mixes persistence concerns into the domain. Data access belongs in repositories.',
    howToFix: [
        'Remove database fields and APIs from the entity.',
        'Create (or use) a repository that owns all data access.',
        'Have the service coordinate repository calls and entity changes.',
    ],
    beforeCode: `@Entity
public class AuditLog {
    @Autowired private JdbcTemplate jdbcTemplate;

    public List<String> recent(int limit) {
        return jdbcTemplate.queryForList(
            "SELECT message FROM audit_log ORDER BY id DESC LIMIT ?", String.class, limit);
    }
}`,
    afterCode: `@Entity
public class AuditLogEntry {
    private Long id;
    private String message;
}

@Repository
public class AuditLogRepository {
    private final JdbcTemplate jdbcTemplate;

    public List<String> recent(int limit) { /* data access here */ }
}`,
    mitigationHint: 'Entities should not contain data access logic — move to Repository',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V114', 'RICA-V401'],
    sourceRef: 'src/entityLayerDetector.ts:101',
    tags: ['jdbc', 'jpa', 'entity', 'repository'],
});
d({
    code: 'RICA-V110',
    name: 'Direct HTTP Call',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer',
    layer: 'controller',
    trigger: 'A Controller method creates or calls an HTTP client type (RestTemplate, WebClient, HttpClient, OkHttpClient, HttpURLConnection, etc.) directly.',
    whyItMatters: 'Controllers are the entry point of your application, not HTTP clients to third parties. Making HTTP calls directly couples the controller to external services, complicates testing (network is now required), and breaks the single responsibility: gateways should own outbound communication.',
    howToFix: [
        'Move the HTTP client into a dedicated gateway/client service.',
        'Inject that gateway into the controller.',
        'Controller delegates outbound calls to the gateway.',
    ],
    beforeCode: `@RestController
public class PaymentController {
    @PostMapping("/pay")
    public String pay() {
        RestTemplate rt = new RestTemplate();
        return rt.getForObject("https://api.payment.io/charge", String.class);
    }
}`,
    afterCode: `@RestController
public class PaymentController {
    private final PaymentGateway paymentGateway;

    public PaymentController(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    @PostMapping("/pay")
    public String pay() {
        return paymentGateway.charge();
    }
}`,
    mitigationHint: 'Delegate HTTP calls to a dedicated gateway service class injected into the controller',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V103', 'RICA-V301'],
    sourceRef: 'src/controllerLayerDetector.ts:199',
    tags: ['http', 'gateway', 'controller'],
});
d({
    code: 'RICA-V111',
    name: 'File I/O in Controller',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer',
    layer: 'controller',
    trigger: 'A Controller method creates or calls file types (File, Files, Path, InputStream/Reader/Writer, FileChannel, etc.) directly.',
    whyItMatters: 'Controllers should not read or write the file system. File handling involves paths, permissions, streaming, and lifecycle concerns that belong in a dedicated service, keeping the controller free of I/O concerns and testable without touching disk.',
    howToFix: [
        'Extract file operations into a service class.',
        'Inject the file-service into the controller.',
    ],
    beforeCode: `@RestController
public class ExportController {
    @GetMapping("/export")
    public String export() throws IOException {
        Path p = Paths.get("/tmp/report.txt");
        Files.write(p, "hello".getBytes());
        return Files.readString(p);
    }
}`,
    afterCode: `@RestController
public class ExportController {
    private final ReportFileService reportFileService;

    public ExportController(ReportFileService reportFileService) {
        this.reportFileService = reportFileService;
    }

    @GetMapping("/export")
    public String export() {
        return reportFileService.export();
    }
}`,
    mitigationHint: 'Move file I/O operations to a service class injected into the controller',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V103'],
    sourceRef: 'src/controllerLayerDetector.ts:210',
    tags: ['file-io', 'controller', 'service'],
});
d({
    code: 'RICA-V112',
    name: 'Background Thread',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer',
    layer: 'controller',
    trigger: 'A Controller method creates or calls thread/executor types (Thread, Runnable, ExecutorService, Future, CompletableFuture, etc.) directly.',
    whyItMatters: "Bare threads in a controller are hard to manage: no lifecycle, no monitoring, no bounded pools, and they burden the servlet container. Spring's `@Async` or a TaskExecutor bean gives you pooled, monitored, cancellable execution and keeps the controller thin.",
    howToFix: [
        'Replace raw thread/executor creation with `@Async` on a service method.',
        'Or inject a TaskExecutor service.',
    ],
    beforeCode: `@RestController
public class NotificationController {
    @PostMapping("/notify")
    public void notify() {
        new Thread(() -> mailService.send()).start();
    }
}`,
    afterCode: `@RestController
public class NotificationController {
    private final NotificationService notificationService;

    @PostMapping("/notify")
    public void notify() {
        notificationService.sendAsync(); // @Async inside
    }
}`,
    mitigationHint: 'Use Spring @Async or a TaskExecutor service instead of managing threads directly in the controller',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V306'],
    sourceRef: 'src/controllerLayerDetector.ts:221',
    tags: ['threading', 'async', 'controller'],
});
d({
    code: 'RICA-V113',
    name: 'Static Cache',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer',
    layer: 'controller',
    trigger: 'A Controller declares a `static` map-like or cache-typed field whose name hints at a cache (contains `cache`, `store`, `pool`, or `buffer`).',
    whyItMatters: 'Static mutable state in a controller persists across all instances and requests. It can leak memory, create concurrency bugs, and silently wed tests to production state. Caching should be a scoped, managed construct — a cache service bean or `@Cacheable` — so lifecycle and eviction are controlled.',
    howToFix: [
        'Remove the static field.',
        'Use a dedicated cache service bean or `@Cacheable`/`@EnableCaching`.',
        'If a simple map is really needed, scope it as a bean with a bounded capacity.',
    ],
    beforeCode: `@RestController
public class LookupController {
    static Map<String, String> cache = new HashMap<>();

    @GetMapping("/lookup")
    public String lookup(@RequestParam String key) {
        return cache.computeIfAbsent(key, k -> "value");
    }
}`,
    afterCode: `@RestController
public class LookupController {
    private final LookupService lookupService; // uses CacheManager

    @GetMapping("/lookup")
    public String lookup(@RequestParam String key) {
        return lookupService.lookup(key);
    }
}`,
    mitigationHint: 'Replace static cache with a scoped cache service bean (@Cacheable or a dedicated cache manager)',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V305'],
    sourceRef: 'src/controllerLayerDetector.ts:368',
    tags: ['cache', 'static', 'concurrency', 'controller'],
});
d({
    code: 'RICA-V114',
    name: 'Raw SQL Access',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'ControllerLayer',
    detector: 'ControllerLayerAnalyzer',
    layer: 'controller',
    trigger: 'A Controller method creates or calls a database access type (DataSource, JdbcTemplate, EntityManager, Connection, Statement, Session, SqlSession, etc.) directly.',
    whyItMatters: 'Controllers must never touch persistence directly. Database access bypasses the transactional/service layers, scatters SQL across the HTTP boundary, and makes query behavior untestable without the controller. All data access belongs in repositories.',
    howToFix: [
        'Move the query/update into a repository method.',
        'Have a service call the repository.',
        'Inject the service into the controller.',
    ],
    beforeCode: `@RestController
public class OrderController {
    @GetMapping("/orders/recent")
    public List<Order> recent() {
        JdbcTemplate jt = new JdbcTemplate(dataSource);
        return jt.query("SELECT * FROM orders", rowMapper);
    }
}`,
    afterCode: `@RestController
public class OrderController {
    private final OrderRepository orderRepository;

    @GetMapping("/orders/recent")
    public List<Order> recent() {
        return orderRepository.findRecent();
    }
}`,
    mitigationHint: 'Move all database access to repository or service layer classes',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V109', 'RICA-V401'],
    sourceRef: 'src/controllerLayerDetector.ts:232',
    tags: ['jdbc', 'sql', 'repository', 'controller'],
});
d({
    code: 'RICA-V201',
    name: 'Exposing Internal Entity',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'A public API endpoint method returns an `@Entity` type (or a collection of entities) directly. Private helper methods are skipped.',
    whyItMatters: 'Returning persistence entities in responses leaks your internal schema and storage model to external consumers. Any schema change becomes a breaking API change. DTOs decouple the API contract from the data model so internal refactors never break clients.',
    howToFix: [
        'Create a response DTO with just the fields the client needs.',
        'Map the entity to the DTO in the service layer.',
        'Return the DTO from the endpoint.',
    ],
    beforeCode: `@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable long id) { // User is @Entity
        return userService.findById(id);
    }
}`,
    afterCode: `@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public UserResponse getUser(@PathVariable long id) {
        return userService.getUserResponse(id); // mapped to DTO
    }
}`,
    mitigationHint: 'Replace the Entity return type with a DTO to avoid leaking persistence details',
    relatedRules: ['RICA-V202', 'RICA-V207', 'RICA-V404'],
    sourceRef: 'src/apiResourceLayerDetector.ts:196',
    tags: ['dto', 'entity', 'api'],
});
d({
    code: 'RICA-V202',
    name: 'Missing DTO Usage',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'An endpoint parameter is an internal domain/entity class instead of a DTO. Private helper methods are skipped.',
    whyItMatters: 'Accepting domain objects directly as request payloads couples your API contract to the internal model and skips the boundary where validation/transformation should happen. Request DTOs let you validate input (see V206) and map only what is needed into the domain.',
    howToFix: [
        'Create a request DTO containing the input fields and validation annotations.',
        'Change the endpoint parameter to the DTO.',
        'Map the DTO to the domain object in the service layer.',
    ],
    beforeCode: `@PostMapping("/orders")
public Order create(@RequestBody Order order) { // internal/entity type
    return orderService.save(order);
}`,
    afterCode: `@PostMapping("/orders")
public OrderResponse create(@RequestBody @Valid OrderRequest req) {
    return orderService.create(req);
}`,
    mitigationHint: 'Create and use a DTO class instead of exposing internal types in the API',
    relatedRules: ['RICA-V201', 'RICA-V206', 'RICA-V207'],
    sourceRef: 'src/apiResourceLayerDetector.ts:217',
    tags: ['dto', 'api', 'validation'],
});
d({
    code: 'RICA-V203',
    name: 'Improper Error Handling',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'An endpoint throws or declares a raw generic exception (`throws Exception`, `throw new Exception(...)`), or calls `printStackTrace()`. Private helper methods are skipped.',
    whyItMatters: 'A bare `Exception` surfacing from an endpoint becomes an opaque 500 to the client — no status code, no actionable message — and stack traces (`printStackTrace`) leak implementation details. Errors should be translated at the API boundary into meaningful HTTP responses.',
    howToFix: [
        'Catch domain exceptions at the boundary and map them to HTTP status codes via `@ExceptionHandler` or `ResponseStatusException`.',
        'Define typed exceptions (NotFound, Conflict, etc.) in the service layer.',
        'Remove `printStackTrace()` calls.',
    ],
    beforeCode: `@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable long id) throws Exception {
        User u = userService.findById(id);
        if (u == null) throw new Exception("user missing");
        return u;
    }
}`,
    afterCode: `@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public UserResponse getUser(@PathVariable long id) {
        return userService.getUserResponse(id); // throws UserNotFoundException
    }

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse notFound(UserNotFoundException e) {
        return new ErrorResponse(404, e.getMessage());
    }
}`,
    mitigationHint: 'Add proper error handling (try-catch or exception declarations) to API methods',
    relatedRules: ['RICA-V201', 'RICA-V206'],
    sourceRef: 'src/apiResourceLayerDetector.ts:280',
    tags: ['error-handling', 'api', 'exceptions'],
});
d({
    code: 'RICA-V204',
    name: 'Business Logic in Resource',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'An API resource method has a business-logic score at or above the configured threshold (default 3), i.e. loops, conditionals, and data manipulation inline in the REST handler.',
    whyItMatters: 'REST resources should be thin: parse, delegate, respond. Inline business logic makes the handler impossible to test without HTTP infrastructure and moves rules away from the service layer, where they belong for reuse and unit testing.',
    howToFix: [
        'Move branches/calculations to a service method.',
        'Delegate from the resource method to the service.',
    ],
    beforeCode: `@PostMapping("/discount")
public double discount(@RequestBody ItemRequest req) {
    double price = req.getPrice();
    if (req.getType().equals("VIP")) price *= 0.8;
    else if (req.getType().equals("STAFF")) price *= 0.9;
    return price;
}`,
    afterCode: `@PostMapping("/discount")
public double discount(@RequestBody ItemRequest req) {
    return priceService.applyDiscount(req.toItem());
}`,
    mitigationHint: 'Move business logic from the API resource to the Service layer',
    configKey: 'enableBusinessLogicChecks',
    relatedRules: ['RICA-V106'],
    sourceRef: 'src/apiResourceLayerDetector.ts:176',
    tags: ['business-logic', 'api', 'thin-controller'],
});
d({
    code: 'RICA-V205',
    name: 'Direct Service Instantiation',
    severity: 'error',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'An API resource has a service field without injection, or a resource method `new`s a service/repository/infrastructure class or calls one through an uninjected reference.',
    whyItMatters: 'Resources must receive services through the DI container. Manual instantiation hard-codes concrete implementations, defeats mocking, and ties the HTTP layer to a specific construction path.',
    howToFix: [
        'Inject services via constructor or `@Autowired`.',
        'Never `new` a service inside a resource method.',
    ],
    beforeCode: `@RestController
public class ReportController {
    @GetMapping("/report")
    public String report() {
        ReportService svc = new ReportService(); // hard-coded
        return svc.build();
    }
}`,
    afterCode: `@RestController
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/report")
    public String report() {
        return reportService.build();
    }
}`,
    mitigationHint: 'Inject the Service via constructor instead of instantiating it',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V101', 'RICA-V103'],
    sourceRef: 'src/apiResourceLayerDetector.ts:92',
    tags: ['di', 'service', 'api'],
});
d({
    code: 'RICA-V206',
    name: 'Missing Validation',
    severity: 'info',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'An endpoint parameter lacks validation annotations (`@Valid`, `@NotNull`, `@Size`/`@Min`/`@Max`, `@Email`, etc.). Non-simple types without validation are flagged; simple types are only flagged when the parameter name contains `id`.',
    whyItMatters: 'Unvalidated input produces cryptic failures deep in the stack instead of clean 400 responses. Validation annotations document the contract and fail fast at the boundary.',
    howToFix: [
        'Annotate the parameter or its type with `@Valid` plus constraints like `@NotNull`, `@Size`, `@Email`, `@Min`.',
        'Enable `@Validated` on the controller for simple/`@RequestParam` values.',
        'Return a uniform validation-error payload via `@ExceptionHandler` (MethodArgumentNotValidException).',
    ],
    beforeCode: `@GetMapping("/orders/{id}")
public OrderResponse get(@RequestParam String id) {
    return orderService.findById(Long.parseLong(id));
}`,
    afterCode: `@GetMapping("/orders/{id}")
public OrderResponse get(@RequestParam @Positive long id) {
    return orderService.findById(id);
}`,
    mitigationHint: 'Add validation annotations (@Valid, @NotNull, etc.) to API method parameters',
    relatedRules: ['RICA-V202', 'RICA-V203'],
    sourceRef: 'src/apiResourceLayerDetector.ts:259',
    tags: ['validation', 'api', 'input'],
});
d({
    code: 'RICA-V207',
    name: 'Exposing Internal Structure',
    severity: 'warning',
    stage: 'stage1',
    stageLabel: STAGE1,
    detectorSource: 'APIResourceLayer',
    detector: 'APIResourceLayerAnalyzer',
    layer: 'api',
    trigger: 'An endpoint returns a non-DTO internal project class instead of a DTO. Entity returns are reported as V201 instead; private helper methods are skipped.',
    whyItMatters: 'Returning internal domain objects (beyond entities) still leaks the internal model into the API contract. A DTO keeps the contract stable even when domain internals change and gives you a place to shape exactly what the client sees.',
    howToFix: [
        'Create a response DTO.',
        'Map the domain object to the DTO in the service layer.',
        'Return the DTO from the endpoint.',
    ],
    beforeCode: `@GetMapping("/invoices/{id}")
public Invoice getInvoice(@PathVariable long id) { // Invoice is an internal model
    return invoiceService.findById(id);
}`,
    afterCode: `@GetMapping("/invoices/{id}")
public InvoiceResponse getInvoice(@PathVariable long id) {
    return invoiceService.getInvoiceResponse(id);
}`,
    mitigationHint: 'Refactor the API to return DTOs instead of internal domain objects',
    relatedRules: ['RICA-V201', 'RICA-V202'],
    sourceRef: 'src/apiResourceLayerDetector.ts:238',
    tags: ['dto', 'api', 'internal-structure'],
});
// ─── Stage 2 — Cross-File Graph Rules ─────────────────────────────────────
const STAGE2 = 'Stage 2 — Cross-File Graph Rules (CrossFileAnalyzer)';
d({
    code: 'RICA-V401',
    name: 'Controller Bypass',
    severity: 'error',
    stage: 'stage2',
    stageLabel: STAGE2,
    detectorSource: 'CrossFileAnalyzer',
    detector: 'controllerBypassRule (dependencyGraph.ts)',
    layer: 'controller → repository',
    trigger: 'A Controller directly calls, holds (has-a), or uses a Repository node in the project dependency graph instead of going through a Service.',
    whyItMatters: 'Controllers should only reach the persistence layer through services, which carry the business rules and transactional boundaries. A direct controller→repository edge lets HTTP concerns and data access bypass the domain entirely, leading to duplicated logic and inconsistent invariants.',
    howToFix: [
        'Move the repository call into a service method.',
        'Inject the service into the controller.',
        'Call the service from the controller and let it touch the repository.',
    ],
    beforeCode: `@RestController
public class OrderController {
    @Autowired private OrderRepository orderRepository; // injects repo directly

    @GetMapping("/orders/recent")
    public List<Order> recent() {
        return orderRepository.findRecent(); // bypasses the service layer
    }
}`,
    afterCode: `@RestController
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/orders/recent")
    public List<Order> recent() {
        return orderService.recentOrders(); // service owns persistence
    }
}`,
    mitigationHint: 'Inject the Repository through a Service layer instead of accessing it directly from the Controller',
    configKey: 'enableArchitecturalChecks',
    relatedRules: ['RICA-V103', 'RICA-V114', 'RICA-V402'],
    sourceRef: 'src/dependencyGraph.ts:549',
    tags: ['layering', 'controller', 'repository', 'graph'],
});
d({
    code: 'RICA-V402',
    name: 'Cross-Layer Violation',
    severity: 'warning',
    stage: 'stage2',
    stageLabel: STAGE2,
    detectorSource: 'CrossFileAnalyzer',
    detector: 'crossLayerViolationRule (dependencyGraph.ts)',
    layer: 'cross-layer',
    trigger: 'A forbidden dependency edge in the graph: service→controller, entity→controller, entity→service, repository→controller, or repository→view.',
    whyItMatters: 'Dependencies must point inward (Controller → Service → Repository → persistence). Any edge that points upward or sideways breaks the layered architecture: lower layers stop being reusable, tests can no longer isolate a layer, and changes ripple in both directions.',
    howToFix: [
        'Identify which direction the dependency should flow (lower layers never know about higher ones).',
        'Move the upward reference into the appropriate service or introduce an interface in the lower layer.',
        'Verify the new edge set against the allowed dependency matrix.',
    ],
    beforeCode: `// service/OrderService.java
import com.foo.presentation.OrderController;

@Service
public class OrderService {
    public void notify() {
        new OrderController().send(); // service reaches up to the HTTP layer
    }
}`,
    afterCode: `// Move the reversal: the controller calls the service.
@RestController
public class OrderController {
    private final OrderService orderService;

    public void notify() {
        orderService.notifySubscribers();
    }
}`,
    mitigationHint: 'Restructure the dependency to follow the layered architecture (Controller → Service → Repository)',
    configKey: 'enableArchitecturalChecks',
    relatedRules: ['RICA-V401', 'RICA-V403', 'RICA-V501'],
    sourceRef: 'src/dependencyGraph.ts:732',
    tags: ['layering', 'dependency', 'graph'],
});
d({
    code: 'RICA-V403',
    name: 'Cyclic / Inverted Dependency',
    severity: 'error',
    stage: 'stage2',
    stageLabel: STAGE2,
    detectorSource: 'CrossFileAnalyzer',
    detector: 'cyclicDependencyRule (dependencyGraph.ts)',
    layer: 'cross-layer / graph',
    trigger: 'Tarjan SCC finds a true cycle among classes, or an inverted edge (a lower layer depending on a higher layer) appears when following `calls`/`has-a`/`uses` edges.',
    whyItMatters: 'Circular dependencies make the code impossible to test in isolation, block other components, and cause initialization and packaging headaches. Inverted edges violate the Dependency Rule and prevent lower layers from being reused by anything above them.',
    howToFix: [
        'Break the cycle by extracting the shared members into a separate module/class.',
        'Introduce an interface in the lower layer and let the higher layer implement it.',
        'Apply the Dependency Inversion Principle so high-level policies do not depend on low-level details.',
    ],
    beforeCode: `// A depends on B, B depends on C, C depends on A
class A { B b; }
class B { C c; }
class C { A a; } // cycle!`,
    mitigationHint: 'Break the cycle by extracting shared logic into a separate module or introducing an interface',
    configKey: 'enableArchitecturalChecks',
    severityContexts: [
        {
            context: 'True SCC cycle between classes (Tarjan)',
            severity: 'error',
        },
        {
            context: 'Inverted dependency edge (lower layer → higher layer, ruleId INVERTED_DEP)',
            severity: 'warning',
        },
    ],
    relatedRules: ['RICA-V402', 'RICA-V501'],
    sourceRef: 'src/dependencyGraph.ts:585',
    tags: ['cycle', 'graph', 'inversion', 'layering'],
});
d({
    code: 'RICA-V404',
    name: 'Entity Exposure',
    severity: 'warning',
    stage: 'stage2',
    stageLabel: STAGE2,
    detectorSource: 'CrossFileAnalyzer',
    detector: 'entityExposureRule (dependencyGraph.ts)',
    layer: 'controller api',
    trigger: 'A Controller exposes an entity layer type in a public method return type or parameter, or via a `public`/`protected` field.',
    whyItMatters: 'Entities are internal persistence/domain shapes. Leaking them across the API boundary couples clients to the data model — schema changes become breaking changes. DTOs define a stable contract at the edge.',
    howToFix: [
        'Replace the entity return type or parameter with a DTO.',
        'Map between entity and DTO in the service layer.',
        'Make entity fields on controllers private and delegate access via services.',
    ],
    beforeCode: `@RestController
public class UserController {
    public User find(long id) {   // returns entity type
        return userService.findById(id);
    }
}`,
    afterCode: `@RestController
public class UserController {
    public UserResponse find(long id) { // returns DTO
        return userService.getResponse(id);
    }
}`,
    mitigationHint: 'Replace the Entity type with a dedicated DTO (Data Transfer Object) in the API contract',
    configKey: 'enableArchitecturalChecks',
    severityContexts: [
        {
            context: 'Entity returned from a public method or accepted as a parameter',
            severity: 'warning',
        },
        {
            context: 'Entity exposed via a public/protected field',
            severity: 'info',
        },
    ],
    relatedRules: ['RICA-V201', 'RICA-V202'],
    sourceRef: 'src/dependencyGraph.ts:644',
    tags: ['dto', 'entity', 'api', 'graph'],
});
d({
    code: 'RICA-V400',
    name: 'Unmapped Graph Rule (fallback)',
    severity: 'warning',
    stage: 'stage2',
    stageLabel: 'Stage 2 — Fallback',
    detectorSource: 'CrossFileAnalyzer',
    detector: 'CrossFileAnalyzer (fallback)',
    layer: 'cross-file',
    trigger: 'Any cross-file rule whose rule id is not mapped to a specific code. Currently reachable only if a new AnalyzerRule is registered without a `CROSS_FILE_CODE_MAP` entry.',
    whyItMatters: 'Acts as a safety net so an unregistered graph rule is still surfaced to the user rather than silently swallowed. New rules should always be documented with a real code.',
    howToFix: [
        'Add the new rule id to `CROSS_FILE_CODE_MAP` and give it a documented code.',
        'Or map the rule to an existing architectural code.',
    ],
    mitigationHint: 'Map the graph rule to a specific documented violation code',
    relatedRules: [],
    sourceRef: 'src/crossFileAnalyzer.ts:32',
    tags: ['fallback', 'graph', 'internal'],
});
// ─── Stage 3 — Package Boundary ───────────────────────────────────────────
const STAGE3 = 'Stage 3 — Package Boundary (PackageBoundaryAnalyzer)';
d({
    code: 'RICA-V501',
    name: 'Package Boundary Violation',
    severity: 'error',
    stage: 'stage3',
    stageLabel: STAGE3,
    detectorSource: 'PackageBoundaryAnalyzer',
    detector: 'PackageBoundaryAnalyzer',
    layer: 'package / top-level layer',
    trigger: 'A file residing in layer A imports a type that lives in layer B, where B is not in A\'s `allowedDeps`. Example: an `application/` class importing a `presentation/` controller.',
    whyItMatters: 'Package boundaries encode the architecture (Clean Architecture / Dependency Rule). Allowing an inner layer to depend on an outer one makes the dependency graph spiral outward and prevents the inner layer from being reused, extracted, or tested in isolation.',
    howToFix: [
        'Move the type that is being depended on toward the inner layer, or depend on its interface.',
        'Invert the dependency so the outer layer depends on the inner one.',
        'Adjust `layerBoundaries.allowedDeps` only when the boundary definition itself is wrong.',
    ],
    beforeCode: `// application/OrderService.java
import com.foo.presentation.UserController; // outer layer import — not allowed

@Service
public class OrderService {
    public void register(UserController controller) { ... }
}`,
    afterCode: `// application/OrderService.java depends only inward
import com.foo.domain.model.Order;

@Service
public class OrderService {
    public Order register(OrderRequest request) { ... }
}
// presentation/UserController.java calls the service (allowed direction)`,
    mitigationHint: "Restructure the dependency: the source layer must not depend on the target layer. Move the type or invert the dependency.",
    configKey: 'enableArchitecturalChecks',
    relatedRules: ['RICA-V402', 'RICA-V403'],
    sourceRef: 'src/packageBoundaryDetector.ts:63',
    tags: ['package', 'layering', 'clean-architecture'],
});
// ─── Stage 4 — Design Pattern Compliance ──────────────────────────────────
const STAGE4 = 'Stage 4 — Design Pattern Compliance (DesignPatternAnalyzer)';
d({
    code: 'RICA-V301',
    name: 'Adapter Missing',
    severity: 'error',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingAdapter',
    layer: 'domain / application',
    trigger: 'A file in the `domain` or `application` layer directly imports an external SDK (AWS SDK, Kafka, Netty, OkHttp, Retry, etc.) and no corresponding adapter/client exists in the infrastructure layer.',
    whyItMatters: 'External vendor code is volatile and owned by someone else. Importing it straight into the core couples your business logic to the vendor. An Adapter/Port pattern keeps the core depending on an interface that infrastructure implements, so vendors can be swapped without touching domain logic.',
    howToFix: [
        'Define a Port interface in the application layer describing only what the core needs.',
        'Implement an Adapter/Client in the infrastructure layer that wraps the vendor SDK.',
        'Inject the port into the domain/application code.',
    ],
    beforeCode: `// domain/OrderNotifier.java
import software.amazon.awssdk.services.sns.SnsClient;

public class OrderNotifier {
    public void send(String message) {
        SnsClient client = SnsClient.create();
        client.publish(...);
    }
}`,
    afterCode: `// application/Port
public interface NotificationPort {
    void send(String message);
}
// infrastructure/Adapter
public class SnsNotificationAdapter implements NotificationPort {
    private final SnsClient client;
    public void send(String message) { client.publish(...); }
}`,
    mitigationHint: 'Wrap the external dependency behind a Port interface in application/port/out/ and create an Adapter implementation in infrastructure/adapter/',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V110'],
    sourceRef: 'src/designPatternAnalyzer.ts:242',
    tags: ['adapter', 'hexagonal', 'port', 'clean-architecture'],
});
d({
    code: 'RICA-V302',
    name: 'God Facade',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkGodFacade',
    layer: 'service / facade',
    trigger: 'A class with 8+ incoming dependencies, 500+ lines, and at least 60% of its methods being trivial delegation.',
    whyItMatters: 'God facades concentrate too much responsibility: many dependents, too much code, and huge surface area. Any change is risky and testing is slow because one class coordinates everything. Responsibilities should be split into focused services.',
    howToFix: [
        'Group the delegated responsibilities into distinct services.',
        'Split the facade by cohesive behavior, not by convenience.',
        'Keep dependents pointing at the small focused services instead of the monolith.',
    ],
    beforeCode: `// 8+ dependents, 600 lines, 70% pass-through methods
public class MegaService {
    public void a() { repoA.find(); }
    public void b() { repoB.find(); }
    public void c() { repoC.find(); }
    // ... dozens more 1-line delegations
}`,
    afterCode: `@Service
public class ProductService { ... }
@Service
public class InventoryService { ... }
@Service
public class PricingService { ... }`,
    mitigationHint: 'Decompose this facade — extract domain logic into domain objects and keep only orchestration here',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V104'],
    sourceRef: 'src/designPatternAnalyzer.ts:337',
    tags: ['facade', 'god-object', 'decomposition'],
});
d({
    code: 'RICA-V303',
    name: 'Strategy Missing',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingStrategy',
    layer: 'service',
    trigger: 'A Service-layer method has at least 4 if/else-if branches that all evaluate the same variable, or a `switch` with at least 4 cases.',
    whyItMatters: 'Long conditional chains on a single discriminator are a Strategy smell: each branch is an algorithm selectable at runtime. Encoding them as separate strategy classes makes behavior extensible without editing the chain and easier to test in isolation.',
    howToFix: [
        'Define a strategy interface for the discriminated behavior.',
        'Move each branch into its own strategy implementation.',
        'Select the strategy at runtime via a factory or a map keyed by the discriminator value.',
    ],
    beforeCode: `public double price(OrderType type, double amount) {
    if (type == OrderType.REGULAR) return amount;
    else if (type == OrderType.VIP) return amount * 0.8;
    else if (type == OrderType.STAFF) return amount * 0.9;
    else if (type == OrderType.SEASONAL) return amount * 0.85;
    throw new IllegalArgumentException("unknown type");
}`,
    afterCode: `public interface PricingStrategy { double price(double amount); }
public class RegularStrategy implements PricingStrategy { ... }
public class VipStrategy implements PricingStrategy { ... }
// strategy chosen via arithmetic map: Map<OrderType, PricingStrategy>`,
    mitigationHint: 'Replace the conditional chain with a Strategy pattern — each branch should be a separate class implementing a common interface',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V304'],
    sourceRef: 'src/designPatternAnalyzer.ts:374',
    tags: ['strategy', 'conditional', 'polymorphism'],
});
d({
    code: 'RICA-V304',
    name: 'Factory Missing',
    severity: 'error',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingFactory',
    layer: 'service / application',
    trigger: 'The same concrete class is created with `new` from at least 3 different callers and the class implements an interface or extends a base class. Classes named `*Builder` are skipped.',
    whyItMatters: 'Repeated construction in many callers couples every caller to the concrete type and its construction details. A factory centralizes object creation, hides wiring, and lets callers depend on the abstraction only.',
    howToFix: [
        'Introduce a Factory or a provider that builds the object.',
        'Have callers receive the factory (or the instance) through DI.',
        'Depends on the abstraction, never on the concrete constructor.',
    ],
    beforeCode: `// new PaymentGateway() appears in 3+ services
@Autowired private String apiKey;
// each service: new PaymentGateway(apiKey, "prod", client)`,
    afterCode: `@Configuration
public class GatewayConfig {
    @Bean
    public PaymentGateway paymentGateway(...) {
        return new PaymentGateway(...);
    }
}
// services inject PaymentGateway`,
    mitigationHint: 'Extract object creation behind a Factory — callers should depend on the interface, not the concrete class',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V101', 'RICA-V303'],
    sourceRef: 'src/designPatternAnalyzer.ts:283',
    tags: ['factory', 'creation', 'dependency-injection'],
});
d({
    code: 'RICA-V305',
    name: 'Mutable Singleton',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMutableSingleton',
    layer: 'any',
    trigger: 'A `static`, non-`final` field whose type is a mutable collection or builder (HashMap, ArrayList, HashSet, StringBuilder, Map/List/Set/Collection, etc.) exists anywhere.',
    whyItMatters: 'Static mutable state is shared global state: one instance per JVM, unwritable to control in tests, and a magnet for concurrency bugs and memory growth. Prefer DI-scoped beans or immutable constants.',
    howToFix: [
        'Replace the static mutable collection with DI-managed beans (`@Bean`, `@Scope`).',
        'Or make the state immutable (`final`, `Collections.unmodifiableMap`).',
        'If cache-like, use a dedicated cache with eviction, not a static field.',
    ],
    beforeCode: `class Registry {
    public static List<String> items = new ArrayList<>();
    public static Map<String, String> config = new HashMap<>();
}`,
    afterCode: `@Component
public class Registry {
    private final Map<String, String> config; // injected/immutable
    public Registry() { this.config = Map.of("region", "us-east-1"); }
}`,
    mitigationHint: 'Replace static mutable state with DI-scoped beans (@Bean, @Scope) or immutable configuration',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V113'],
    sourceRef: 'src/designPatternAnalyzer.ts:140',
    tags: ['singleton', 'static', 'mutable', 'concurrency'],
});
d({
    code: 'RICA-V306',
    name: 'Raw Thread Spawn',
    severity: 'error',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkRawThread',
    layer: 'any (outside @Configuration)',
    trigger: 'Code creates a raw thread/executor type (`new Thread`, `Executors.*`, `new ThreadPoolExecutor`) or calls `Executors.execute()` directly, outside of `@Configuration` classes.',
    whyItMatters: 'Raw thread management bypasses the container: no pooling, no monitoring, no graceful shutdown, no task distribution on a multi-node deployment. Use a managed executor so concurrency is bounded and observable.',
    howToFix: [
        'Inject a `TaskExecutor`/`ExecutorService` bean instead of creating threads.',
        'Or annotate the method with `@Async` and call it through the container proxy.',
        'Never spawn bare threads from controllers or services.',
    ],
    beforeCode: `@Service
public class ReportService {
    public void generateAsync() {
        new Thread(() -> generate()).start(); // unmanaged thread
    }
}`,
    afterCode: `@Service
public class ReportService {
    public void generate() { ... }

    @Async
    public void generateAsync() { generate(); } // managed by executor bean
}`,
    mitigationHint: 'Use @Async or a TaskExecutor bean instead of managing threads directly — this gives lifecycle management and monitoring',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V112'],
    sourceRef: 'src/designPatternAnalyzer.ts:94',
    tags: ['thread', 'executor', 'async', 'concurrency'],
});
d({
    code: 'RICA-V307',
    name: 'Missing Abstraction',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingAbstraction',
    layer: 'any',
    trigger: 'An interface or abstract class has exactly one implementing class in the project.',
    whyItMatters: 'An abstraction with a single implementation is often premature indirection (YAGNI). Either it needs a second implementation to be justified, or the indirection should be collapsed. RICA warns so the cost of the seam is a deliberate choice, not an accident.',
    howToFix: [
        'Either remove the interface and use the concrete class directly.',
        'Or extract a second implementation to justify the abstraction.',
        'Document why the seam exists if it is intentional (e.g. future provider).',
    ],
    beforeCode: `public interface PaymentGateway { void charge(double amount); }
public class StripeGateway implements PaymentGateway { ... } // the only impl`,
    afterCode: `// Option A: collapse the indirection
public class StripeGateway { public void charge(double amount) { ... } }
// Option B: add a real second implementation and keep the interface`,
    mitigationHint: 'Either this abstraction is unnecessary (YAGNI — consider inlining), or add more implementations to justify the indirection',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V303', 'RICA-V304'],
    sourceRef: 'src/designPatternAnalyzer.ts:162',
    tags: ['abstraction', 'interface', 'yagni'],
});
d({
    code: 'RICA-V308',
    name: 'Leaking Construction Logic',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkLeakingConstruction',
    layer: 'service / application',
    trigger: 'A business method performs complex object construction, nested constructor calls, or branching inside constructor arguments beyond the configured construction-statement limit.',
    whyItMatters: 'Construction-heavy business methods mix orchestration with object assembly. That makes the method harder to test and hides construction policy in unrelated logic. A Builder or Factory centralizes the assembly rules and leaves the business method focused on the use case.',
    howToFix: [
        'Move complex construction into a Builder, Factory, or assembler.',
        'Keep branching decisions out of constructor argument lists.',
        'Inject the factory/builder when construction requires external policy.',
    ],
    mitigationHint: 'Extract complex object initialization into a Builder or Factory so business methods stay focused on orchestration',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V304', 'RICA-V101'],
    sourceRef: 'src/designPatternAnalyzer.ts:535',
    tags: ['builder', 'factory', 'construction'],
});
d({
    code: 'RICA-V309',
    name: 'Fat Interface',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkFatInterface',
    layer: 'interface',
    trigger: 'An interface declares more methods than the configured limit, or clients use less than half of a reasonably sized interface surface.',
    whyItMatters: 'Large interfaces force clients to depend on operations they do not use. This violates the Interface Segregation Principle and makes changes ripple through unrelated callers.',
    howToFix: [
        'Split the interface by cohesive responsibilities.',
        'Point each client at the smallest interface it actually needs.',
        'Keep broad facade contracts separate from focused domain ports.',
    ],
    mitigationHint: 'Split this interface by responsibility (ISP) - clients should depend only on the methods they actually use',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V307', 'RICA-V302'],
    sourceRef: 'src/designPatternAnalyzer.ts:588',
    tags: ['isp', 'interface', 'solid'],
});
d({
    code: 'RICA-V310',
    name: 'Missing Command',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingCommand',
    layer: 'service',
    trigger: 'A complex method performs multiple distinct persistence writes without a transactional boundary or command object.',
    whyItMatters: 'Multi-step writes are workflow units. When they are left inline, retry, rollback, auditing, and testing concerns become tangled with service logic. A Command object or explicit transaction boundary makes the write sequence intentional.',
    howToFix: [
        'Wrap the write sequence in an explicit Command object or use-case class.',
        'Add a transactional boundary where the unit of work must commit atomically.',
        'Keep validation and write orchestration visible at one boundary.',
    ],
    mitigationHint: 'Encapsulate each multi-step write sequence as a Command object (or @Transactional boundary) to keep transactions explicit',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V304', 'RICA-V302'],
    sourceRef: 'src/designPatternAnalyzer.ts:664',
    tags: ['command', 'transaction', 'persistence'],
});
d({
    code: 'RICA-V311',
    name: 'Missing Prototype',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingPrototype',
    layer: 'service / mapper',
    trigger: 'A method manually copies several matching fields with getter-to-setter pairs instead of using a clone, copy constructor, or mapper abstraction.',
    whyItMatters: 'Manual field copying is brittle. New fields are easy to forget, copy semantics are duplicated, and deep-copy behavior becomes inconsistent across the codebase.',
    howToFix: [
        'Use a copy constructor, clone method, or explicit copy factory.',
        'For DTO mapping, use a dedicated mapper and keep it exempt from prototype findings.',
        'Keep deep-copy behavior in one reviewed implementation.',
    ],
    mitigationHint: 'Copy objects via clone()/copy constructors (Prototype) instead of manual field-by-field getter-to-setter copying',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V312'],
    sourceRef: 'src/designPatternAnalyzer.ts:691',
    tags: ['prototype', 'copy', 'mapping'],
});
d({
    code: 'RICA-V312',
    name: 'Fragmented Factories',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkFragmentedFactories',
    layer: 'factory',
    trigger: 'Multiple concrete `*Factory` classes create products but share no common factory abstraction.',
    whyItMatters: 'A set of unrelated concrete factories makes product-family creation inconsistent and hard to extend. An Abstract Factory gives callers one stable creation contract.',
    howToFix: [
        'Introduce a common factory interface.',
        'Group related product creation behind that interface.',
        'Inject the abstraction instead of selecting concrete factories throughout the code.',
    ],
    mitigationHint: 'Introduce an Abstract Factory interface so related product families are created through a unified hierarchy',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V304', 'RICA-V307'],
    sourceRef: 'src/designPatternAnalyzer.ts:736',
    tags: ['abstract-factory', 'factory', 'creation'],
});
d({
    code: 'RICA-V313',
    name: 'Missing Decorator',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingDecorator',
    layer: 'service / application',
    trigger: 'A method interleaves repeated cross-cutting calls such as logging, metrics, tracing, or audit with business calls.',
    whyItMatters: 'Cross-cutting behavior embedded in business methods is duplicated and easy to apply inconsistently. Decorators or AOP advisors keep those concerns composable and testable.',
    howToFix: [
        'Extract logging, metrics, tracing, or audit behavior into a decorator/advisor.',
        'Keep the core service method focused on business work.',
        'Apply the decorator consistently at composition time.',
    ],
    mitigationHint: 'Extract cross-cutting concerns (logging, metrics, tracing, audit) into dedicated decorators or AOP advisors',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V318'],
    sourceRef: 'src/designPatternAnalyzer.ts:767',
    tags: ['decorator', 'aop', 'cross-cutting'],
});
d({
    code: 'RICA-V314',
    name: 'Missing Composite',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingComposite',
    layer: 'domain / service',
    trigger: 'A loop branches on multiple `instanceof` checks to handle leaf and container-like objects differently.',
    whyItMatters: 'Repeated type checks make tree-like structures hard to extend. A Composite interface lets leaves and containers expose one operation so clients stop branching on concrete types.',
    howToFix: [
        'Extract a shared component interface.',
        'Move type-specific behavior behind polymorphic implementations.',
        'Iterate over the component abstraction instead of branching with `instanceof`.',
    ],
    mitigationHint: 'Expose a uniform Component interface so leaves and containers are treated identically - drop instanceof/loop branching',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V303'],
    sourceRef: 'src/designPatternAnalyzer.ts:795',
    tags: ['composite', 'instanceof', 'polymorphism'],
});
d({
    code: 'RICA-V315',
    name: 'Flyweight Missing',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkRedundantMemory',
    layer: 'any',
    trigger: 'A loop repeatedly allocates immutable value-like objects such as Money, Currency, Price, Amount, Rate, or Config.',
    whyItMatters: 'Repeated value-object allocation inside hot loops creates unnecessary memory pressure. Reusing immutable values or caching shared instances reduces allocation churn without changing behavior.',
    howToFix: [
        'Hoist invariant value construction outside the loop.',
        'Cache frequently reused immutable values.',
        'Prefer shared constants for stable configuration-like values.',
    ],
    mitigationHint: 'Reuse immutable value objects (Flyweight/cache) instead of allocating them inside loops or stream pipelines',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V305'],
    sourceRef: 'src/designPatternAnalyzer.ts:825',
    tags: ['flyweight', 'memory', 'allocation'],
});
d({
    code: 'RICA-V316',
    name: 'Scattered State Machine',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkScatteredStateMachine',
    layer: 'domain / service',
    trigger: 'The same status/state comparisons appear across at least the configured number of classes.',
    whyItMatters: 'State transition rules scattered across classes drift over time. Encapsulating state-specific behavior keeps transitions explicit, local, and easier to test.',
    howToFix: [
        'Identify the state enum or discriminator.',
        'Move state-specific behavior into State objects or a transition table.',
        'Make callers delegate to the state abstraction instead of branching directly.',
    ],
    mitigationHint: 'Encapsulate status/state transitions in State objects instead of scattering hardcoded enum comparisons',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V303'],
    sourceRef: 'src/designPatternAnalyzer.ts:848',
    tags: ['state', 'state-machine', 'conditional'],
});
d({
    code: 'RICA-V317',
    name: 'Duplicate Algorithm',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkDuplicateAlgorithm',
    layer: 'any',
    trigger: 'Two methods in different classes have highly similar call sequences while varying receiver types or sub-steps.',
    whyItMatters: 'Duplicated algorithm skeletons drift independently. Template Method keeps the invariant sequence in one place and lets subclasses or collaborators supply the varying steps.',
    howToFix: [
        'Extract the common call sequence into a shared template method.',
        'Move differing operations behind abstract hooks or strategy collaborators.',
        'Keep only true variation points outside the template.',
    ],
    mitigationHint: 'Extract the common skeleton into a Template Method and vary only the differing sub-steps per class',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V303', 'RICA-V323'],
    sourceRef: 'src/designPatternAnalyzer.ts:879',
    tags: ['template-method', 'duplication', 'algorithm'],
});
d({
    code: 'RICA-V318',
    name: 'Hardcoded Notifications',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkHardcodedNotifier',
    layer: 'service',
    trigger: 'One method directly calls several notification, audit, event, or publisher targets.',
    whyItMatters: 'Hardcoding every side effect into the use case makes notification policy difficult to change and test. Observer/event publication lets subscribers vary independently from the core workflow.',
    howToFix: [
        'Publish a domain/application event at the state change.',
        'Move each notification or audit side effect into a subscriber/listener.',
        'Keep the core method unaware of concrete notification channels.',
    ],
    mitigationHint: 'Decouple notification/audit side-effects via an Observer/event bus instead of direct multi-service calls',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V313'],
    sourceRef: 'src/designPatternAnalyzer.ts:938',
    tags: ['observer', 'events', 'notifications'],
});
d({
    code: 'RICA-V319',
    name: 'Monolithic Pipeline',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMonolithicPipeline',
    layer: 'service / validator',
    trigger: 'A method contains at least the configured number of sequential top-level guard or validation clauses across distinct targets.',
    whyItMatters: 'Long linear validation blocks are hard to reorder, reuse, or configure. Chain of Responsibility turns each guard into a focused handler and makes the pipeline explicit.',
    howToFix: [
        'Extract each validation step into a handler.',
        'Compose handlers in the required order.',
        'Keep simple one-target null guard ladders inline when they are only defensive navigation.',
    ],
    mitigationHint: 'Decompose the linear guard/validation chain into configurable Chain-of-Responsibility handlers',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V321'],
    sourceRef: 'src/designPatternAnalyzer.ts:965',
    tags: ['chain-of-responsibility', 'validation', 'guards'],
});
d({
    code: 'RICA-V320',
    name: 'Service Locator',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkServiceLocator',
    layer: 'any (outside @Configuration)',
    trigger: 'Code outside configuration dynamically looks up dependencies through ApplicationContext, BeanFactory, ServiceLocator, Registry, or similar APIs.',
    whyItMatters: 'Service Locator hides dependencies until runtime and makes tests depend on container state. Constructor or field injection keeps dependencies explicit and replaceable.',
    howToFix: [
        'Declare the dependency as a constructor parameter or injected field.',
        'Keep dynamic bean lookup in configuration/composition code only.',
        'Replace generic locator access with typed ports where possible.',
    ],
    mitigationHint: 'Inject dependencies constructor/field-style instead of looking them up via ApplicationContext/ServiceLocator',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V101', 'RICA-V103'],
    sourceRef: 'src/designPatternAnalyzer.ts:1005',
    tags: ['service-locator', 'dependency-injection', 'spring'],
});
d({
    code: 'RICA-V321',
    name: 'Excessive Null Checks',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkExcessiveNullChecks',
    layer: 'any',
    trigger: 'A method performs at least the configured number of null checks across multiple distinct target roots.',
    whyItMatters: 'Scattered null checks usually mean upstream contracts are unclear. Null Objects, Optional return types, and empty collections make absence explicit and reduce defensive boilerplate.',
    howToFix: [
        'Return empty collections instead of null collections.',
        'Use Optional at boundaries where absence is expected.',
        'Introduce Null Object defaults for common nullable collaborators.',
    ],
    mitigationHint: 'Replace repetitive null checks with Optional, Null Objects, or empty collections at the source',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V319'],
    sourceRef: 'src/designPatternAnalyzer.ts:1044',
    tags: ['null-object', 'optional', 'defensive-code'],
});
d({
    code: 'RICA-V322',
    name: 'Missing Proxy',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingProxy',
    layer: 'service / application (non-infrastructure)',
    trigger: 'A non-infrastructure business method directly instantiates or accesses a heavy resource type (EntityManager, DataSource, Connection, Socket, HttpClient, RestTemplate, etc.) via `new` or sensitive factory calls (`getConnection`, `open`, `connect`) without a Proxy/managed wrapper or interface indirection in the infrastructure layer.',
    whyItMatters: 'Heavy resources require lifecycle, access-control, and caching concerns (lazy loading, pooling, security checks) that a Proxy centralizes. Direct creation scatters construction cost, leaks connection handling into business logic, and makes testing and resource pooling impossible. A Proxy or injected bean keeps the business layer decoupled from resource acquisition.',
    howToFix: [
        'Create a Proxy or wrapper interface in the application layer (e.g., ConnectionProvider, ResourceProxy).',
        'Implement it in infrastructure with pooling/lazy/access-control logic.',
        'Inject the proxy interface into business methods instead of calling `new` or `getConnection()` directly.',
    ],
    beforeCode: `@Service
public class OrderService {
    public void process() {
        DataSource ds = new DataSource("jdbc:mysql://...");
        Connection conn = ds.getConnection();
        conn.execute("SELECT ...");
    }
}`,
    afterCode: `@Service
public class OrderService {
    private final ConnectionProxy connectionProxy;
    public OrderService(ConnectionProxy connectionProxy) {
        this.connectionProxy = connectionProxy;
    }
    public void process() {
        connectionProxy.execute("SELECT ...");
    }
}`,
    mitigationHint: 'Access heavy resources through a Proxy or managed wrapper/bean (lazy loading, access control, caching) instead of direct instantiation in business logic',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V301', 'RICA-V306'],
    sourceRef: 'src/designPatternAnalyzer.ts:970',
    tags: ['proxy', 'resource', 'heavy-resource', 'structural'],
});
d({
    code: 'RICA-V323',
    name: 'Missing Bridge',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: STAGE4,
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'checkMissingBridge',
    layer: 'any (abstract hierarchy)',
    trigger: 'An abstract class has ≥4 concrete subclasses whose names exhibit combinatorial naming (e.g., RedSquare, BlueSquare, RedCircle, BlueCircle or DatabaseLogger, FileLogger, DatabaseNotifier, FileNotifier) indicating two orthogonal dimensions collapsed into one inheritance hierarchy. Both prefix and suffix repetition must appear.',
    whyItMatters: 'Collapsing two independent dimensions (e.g., color × shape, storage × notifier) into a single hierarchy causes combinatorial explosion: adding one value to either dimension multiplies the class count. The Bridge pattern decouples abstraction from implementation via composition, keeping hierarchies linear and extensible.',
    howToFix: [
        'Identify the two orthogonal dimensions (e.g., abstraction = Shape, implementation = Color).',
        'Extract the second dimension as a composed interface/strategy (e.g., `private final Color color`).',
        'Let concrete abstractions delegate to the implementation instead of encoding it in the class name.',
    ],
    beforeCode: `abstract class Shape { abstract void draw(); }
class RedSquare extends Shape { void draw() { /* red square */ } }
class BlueSquare extends Shape { void draw() { /* blue square */ } }
class RedCircle extends Shape { void draw() { /* red circle */ } }
class BlueCircle extends Shape { void draw() { /* blue circle */ } }`,
    afterCode: `interface Color { void apply(); }
class Red implements Color { void apply() { /* red */ } }
abstract class Shape { protected final Color color; Shape(Color c){this.color=c;} abstract void draw(); }
class Square extends Shape { Square(Color c){super(c);} void draw(){ color.apply(); /* square */ } }`,
    mitigationHint: 'Decouple orthogonal dimensions via composition (Bridge) instead of exploding into combinatorial subclasses',
    configKey: 'enableDesignPatternChecks',
    relatedRules: ['RICA-V307', 'RICA-V303'],
    sourceRef: 'src/designPatternAnalyzer.ts:1030',
    tags: ['bridge', 'hierarchy', 'structural', 'composition'],
});
d({
    code: 'RICA-V300',
    name: 'Unmapped Design-Pattern Rule (fallback)',
    severity: 'warning',
    stage: 'stage4',
    stageLabel: 'Stage 4 — Fallback',
    detectorSource: 'DesignPatternAnalyzer',
    detector: 'DesignPatternAnalyzer (fallback)',
    layer: 'design-pattern',
    trigger: 'Any design-pattern rule type that is not mapped to a specific code. Currently unreachable because every emitted rule type has a dedicated code.',
    whyItMatters: 'Safety net for future design-pattern rules so they surface as visible violations rather than being swallowed. New rules should be documented with a real code.',
    howToFix: [
        'Map the new rule type in `DP_RULE_CODES` and document it.',
    ],
    mitigationHint: 'Map the design-pattern rule to a specific documented violation code',
    relatedRules: [],
    sourceRef: 'src/designPatternAnalyzer.ts:70',
    tags: ['fallback', 'design-pattern', 'internal'],
});
d({
    code: 'RICA-V000',
    name: 'Unmapped Legacy Violation (fallback)',
    severity: 'warning',
    stage: 'fallback',
    stageLabel: 'Fallback',
    detectorSource: 'ViolationManager',
    detector: 'ViolationManager.layerViolationToUnified',
    layer: 'any',
    trigger: 'A layer-detector violation whose `type` is not present in `RULE_CODE_MAP`. Currently reachable only if a new detector type is added without a code mapping.',
    whyItMatters: 'Guarantees every violation still carries a code even when the mapping is incomplete, so the UI never shows an uncoded row. New detector types should always be assigned a real code.',
    howToFix: [
        'Add the new detector `type` to `RULE_CODE_MAP` and document it.',
    ],
    mitigationHint: 'Map the legacy detector type to a specific documented violation code',
    relatedRules: [],
    sourceRef: 'src/violationManager.ts:77',
    tags: ['fallback', 'internal'],
});
// ─── Public API ───────────────────────────────────────────────────────────
/** All documented violations, sorted by code. */
exports.VIOLATION_CATALOG = Object.values(CATALOG_BY_CODE)
    .sort((a, b) => a.code.localeCompare(b.code));
/** Lookup by code (e.g. 'RICA-V401'). */
exports.VIOLATION_DOC_BY_CODE = CATALOG_BY_CODE;
/**
 * Relative documentation slug for a code, e.g. 'RICA-V101' → '/violations/RICA-V101'.
 * Returns undefined for unknown codes.
 */
function violationDocSlug(code) {
    if (!code)
        return undefined;
    return CATALOG_BY_CODE[code] ? `/violations/${code}` : undefined;
}
//# sourceMappingURL=violationCatalog.js.map