/**
 * Generates the VitePress documentation site for RICA violation codes from the
 * shared catalog (src/violationCatalog.ts) so docs can never drift from the analyzers.
 *
 * Usage:
 *   node scripts/generate-docs.cjs            # (re)write docs/violations/*.md + docs/rule-matrix.md
 *   node scripts/generate-docs.cjs --verify   # same, but only check for drift (exit 1 if out of date)
 *
 * The catalog is a .ts module; Node cannot import it natively, so we transpile it
 * to CommonJS via TypeScript's transpileModule into a temp file and require it.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src', 'violationCatalog.ts');
const VIOLATIONS_DIR = path.join(ROOT, 'docs', 'violations');
const RULE_MATRIX_PATH = path.join(ROOT, 'docs', 'rule-matrix.md');

const STAGE_ORDER = ['stage1', 'stage2', 'stage3', 'stage4', 'fallback'];
const SEVERITY_LABEL = { error: 'Error', warning: 'Warning', info: 'Info' };

/** Load the catalog module via transpose-to-CJS-and-require. */
function loadCatalog() {
  const source = fs.readFileSync(CATALOG_PATH, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const tmp = path.join(os.tmpdir(), `rica-violationCatalog-${process.pid}.cjs`);
  fs.writeFileSync(tmp, outputText, 'utf8');
  let mod;
  try {
    // Clear the require cache so --verify after build can re-see fresh exports.
    delete require.cache[require.resolve(tmp)];
    mod = require(tmp);
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) { /* temp already gone */ }
  }
  return mod;
}

function severityBadge(severity) {
  const map = {
    error: `<Badge type="danger" text="Error" />`,
    warning: `<Badge type="warning" text="Warning" />`,
    info: `<Badge type="tip" text="Info" />`,
  };
  return map[severity] || severity;
}

/** Renders a contiguous fenced code block safely (no nested fence collisions). */
function fence(code) {
  if (!code) return '';
  const ticks = code.includes('```') ? '````' : '```';
  return `${ticks}\n${code.trim()}\n${ticks}\n`;
}

function normalizeCodeLines(code) {
  return String(code || '').trim().split(/\r?\n/);
}

function renderDiff(beforeCode, afterCode) {
  if (!beforeCode || !afterCode) return '';
  const before = normalizeCodeLines(beforeCode);
  const after = normalizeCodeLines(afterCode);
  const dp = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));

  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      dp[i][j] = before[i] === after[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const diff = [];
  const diffLine = (prefix, line) => line ? `${prefix} ${line}` : prefix === ' ' ? '' : prefix;
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      diff.push(diffLine(' ', before[i]));
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      diff.push(diffLine('-', before[i]));
      i++;
    } else {
      diff.push(diffLine('+', after[j]));
      j++;
    }
  }
  while (i < before.length) diff.push(diffLine('-', before[i++]));
  while (j < after.length) diff.push(diffLine('+', after[j++]));

  return `\`\`\`diff\n${diff.join('\n')}\n\`\`\`\n`;
}

function explainStep(step, entry) {
  const lower = step.toLowerCase();
  if (lower.includes('remove') || lower.includes('stop') || lower.includes('avoid')) {
    return 'This removes the exact pattern that triggered the rule, so the analyzer no longer sees the unsafe dependency or responsibility in this location.';
  }
  if (lower.includes('inject') || lower.includes('@autowired') || lower.includes('@inject') || lower.includes('constructor')) {
    return 'This makes the dependency visible and lets the framework supply it, which improves testability and keeps object lifecycle out of business code.';
  }
  if (lower.includes('dto') || lower.includes('map')) {
    return 'This protects the API contract from internal domain or persistence classes and gives you a stable shape for external responses.';
  }
  if (lower.includes('service')) {
    return 'This moves orchestration or business decisions into the application layer, leaving controllers/resources focused on input and output.';
  }
  if (lower.includes('repository') || lower.includes('persistence') || lower.includes('database') || lower.includes('sql')) {
    return 'This keeps persistence behind the correct boundary, so domain and presentation code do not depend on storage details.';
  }
  if (lower.includes('interface') || lower.includes('abstraction') || lower.includes('port')) {
    return 'This points callers at a stable contract instead of a concrete implementation, reducing ripple effects when the implementation changes.';
  }
  if (lower.includes('factory') || lower.includes('builder')) {
    return 'This moves construction policy into one named place, so callers do not repeat object setup rules.';
  }
  if (lower.includes('strategy') || lower.includes('polymorphism') || lower.includes('state')) {
    return 'This replaces branching with named behaviors, making each variation easier to test and change independently.';
  }
  if (lower.includes('async') || lower.includes('executor') || lower.includes('thread')) {
    return 'This gives threading lifecycle to the framework or infrastructure layer instead of scattering it through business methods.';
  }
  if (lower.includes('validate') || lower.includes('@valid') || lower.includes('constraint')) {
    return 'This rejects bad input at the boundary before it reaches business logic or persistence code.';
  }
  return `This keeps the code aligned with the ${entry.layer} responsibility expected by ${entry.code}.`;
}

const COMMON_FRAMEWORK_CASES = {
  'RICA-V501': [
    {
      title: 'Spring Data imports such as @Query, @Modifying, @Param',
      when: 'The highlighted import is `org.springframework.data.jpa.repository.Query`, `org.springframework.data.jpa.repository.Modifying`, `org.springframework.data.repository.query.Param`, or another repository-only Spring Data type.',
      doThis: [
        'Check the package of the current file first. If it is an application/service class, move the annotated method into a repository interface under the repository/infrastructure layer.',
        'Let the service call that repository through constructor injection instead of owning `@Query` or `@Modifying` directly.',
        'If the current file is already a repository and RICA still reports V501 for the Spring framework import, treat the layer boundary config as too broad. Add/adjust framework-package allowances instead of moving the code.',
      ],
      avoid: 'Do not put JPA query annotations in controllers, services, DTOs, entities, or domain objects just to make the code convenient. They belong at the persistence boundary.',
    },
    {
      title: 'Controller annotations imported into service/domain code',
      when: 'The import is a Spring MVC/Web annotation such as `@RestController`, `@RequestMapping`, `@GetMapping`, `ResponseEntity`, or `HttpServletRequest`.',
      doThis: [
        'Move request mapping, HTTP status, headers, and servlet objects back to the presentation/controller layer.',
        'Pass plain command/query DTOs or primitives into the service.',
        'Return a domain result or response DTO from the service, then convert it to HTTP response shape in the controller.',
      ],
      avoid: 'Do not make the service depend on HTTP classes. That makes the application layer impossible to reuse outside REST.',
    },
    {
      title: 'Repository/domain import from the wrong direction',
      when: 'An inner layer imports an outer-layer implementation, or a lower-level package imports an application/service package.',
      doThis: [
        'Move shared contracts inward as interfaces or simple DTO/value types.',
        'Implement those contracts outward in infrastructure or presentation.',
        'Inject the inward-facing interface where the dependency is needed.',
      ],
      avoid: 'Do not fix this by simply adding the outer layer to `allowedDeps` unless the architecture rule itself is wrong for your project.',
    },
  ],
  'RICA-V102': [
    {
      title: 'Repository field exists but has no injection path',
      when: 'A service has `private OrderRepository orderRepository;` with no constructor assignment and no DI annotation.',
      doThis: [
        'Prefer constructor injection: make the repository `private final` and add it as a constructor parameter.',
        'If the project uses field injection, add `@Autowired` to the field and import the annotation.',
        'Remove manual `new Repository(...)` construction if it exists.',
      ],
      avoid: 'Do not silence this by making the repository static or creating it inside each method.',
    },
  ],
  'RICA-V103': [
    {
      title: 'Controller calls a service that is not injected',
      when: 'A controller has a service field, parameter, or receiver that RICA cannot prove was supplied by Spring/DI.',
      doThis: [
        'Add the service as a constructor dependency on the controller.',
        'Use the service interface or application-service class, not a concrete `ServiceImpl` when possible.',
        'Keep request parsing in the controller and business workflow in the service.',
      ],
      avoid: 'Do not instantiate the service in the controller with `new`.',
    },
  ],
  'RICA-V110': [
    {
      title: 'RestTemplate/WebClient/HttpClient inside a controller',
      when: 'The endpoint method directly calls another HTTP service.',
      doThis: [
        'Create a gateway/client service such as `PaymentGateway` or `InventoryClient`.',
        'Move `RestTemplate`, `WebClient`, `HttpClient`, URL construction, retry handling, and response parsing into that gateway.',
        'Inject the gateway into the controller or application service.',
      ],
      avoid: 'Do not keep remote API protocol details inside controller methods.',
    },
  ],
  'RICA-V114': [
    {
      title: 'Raw SQL or JDBC appears outside repository/infrastructure',
      when: 'RICA sees SQL strings, `JdbcTemplate`, `Connection`, `PreparedStatement`, or `EntityManager` access in controller/service/domain code.',
      doThis: [
        'Move the query into a repository method.',
        'Use Spring Data derived queries or `@Query` in the repository interface when appropriate.',
        'Let the service call a named repository method that describes the business intent.',
      ],
      avoid: 'Do not paste SQL into a service to avoid creating a repository method.',
    },
  ],
  'RICA-V201': [
    {
      title: 'Endpoint returns an Entity directly',
      when: 'A controller/resource method returns `User`, `Order`, `List<Order>`, `ResponseEntity<Order>`, or another persistence/domain object.',
      doThis: [
        'Create a response DTO with only fields the API is allowed to expose.',
        'Map the entity to the DTO before returning.',
        'Keep entity relationships, lazy fields, and persistence annotations out of the response contract.',
      ],
      avoid: 'Do not annotate the entity with JSON ignore annotations as the primary architecture fix. That hides symptoms but keeps the API coupled to persistence.',
    },
  ],
  'RICA-V202': [
    {
      title: 'Endpoint accepts an Entity as request body',
      when: 'A controller/resource parameter uses a domain/entity type for incoming JSON.',
      doThis: [
        'Create a request DTO for the endpoint input.',
        'Validate the DTO at the boundary.',
        'Map the DTO into domain commands/entities inside the service layer.',
      ],
      avoid: 'Do not expose entity setters and persistence fields to clients through request JSON.',
    },
  ],
  'RICA-V203': [
    {
      title: 'Endpoint throws broad exceptions',
      when: 'A controller/resource method declares or throws `Exception`, `RuntimeException`, or returns raw error strings.',
      doThis: [
        'Throw domain-specific exceptions from the service.',
        'Map them in `@ControllerAdvice`/exception handlers.',
        'Return stable error DTOs with the right HTTP status.',
      ],
      avoid: 'Do not catch everything in the endpoint and return `500` for all failures.',
    },
  ],
  'RICA-V205': [
    {
      title: 'Controller creates service with new',
      when: 'A controller method uses `new OrderService()` or `new PaymentServiceImpl()`.',
      doThis: [
        'Register the service as a Spring bean with `@Service` or configuration.',
        'Inject it into the controller through the constructor.',
        'Remove direct construction from the endpoint method.',
      ],
      avoid: 'Do not make the service static/global to bypass dependency injection.',
    },
  ],
  'RICA-V206': [
    {
      title: 'Request body has no validation',
      when: 'A POST/PUT/PATCH endpoint accepts a request DTO without `@Valid`/`@Validated` or field constraints.',
      doThis: [
        'Add `@Valid` to `@RequestBody` DTO parameters.',
        'Add constraints such as `@NotNull`, `@NotBlank`, `@Size`, `@Min`, or `@Email` inside the DTO.',
        'Keep primitive path/query parameters constrained only when the domain really requires it.',
      ],
      avoid: 'Do not only add `@Valid` if the DTO has no field constraints. That validates nothing useful.',
    },
  ],
  'RICA-V301': [
    {
      title: 'External SDK type leaks into application code',
      when: 'Application/service code imports vendor SDK classes, HTTP response models, payment SDK objects, or cloud client request/response types.',
      doThis: [
        'Define a local port/interface that says what the application needs.',
        'Implement the port in an infrastructure adapter using the SDK.',
        'Map SDK request/response objects to local DTOs or domain values at the adapter boundary.',
      ],
      avoid: 'Do not let vendor classes become method parameters or return types in business services.',
    },
  ],
  'RICA-V320': [
    {
      title: 'ApplicationContext.getBean or service locator used in business code',
      when: 'A service/controller asks the container for dependencies dynamically.',
      doThis: [
        'Inject the dependency directly through the constructor.',
        'If selection is dynamic, inject a map/list of strategies and choose by key.',
        'Keep `getBean` usage in configuration/bootstrap code only.',
      ],
      avoid: 'Do not hide dependencies behind service lookup. It makes tests and architecture analysis weaker.',
    },
  ],
  'RICA-V322': [
    {
      title: 'Heavy resource created directly',
      when: 'Business code constructs or opens `DataSource`, `Connection`, `Socket`, `HttpClient`, `EntityManager`, or similar resources.',
      doThis: [
        'Move resource creation to infrastructure/configuration.',
        'Expose a small proxy/gateway interface to the application layer.',
        'Inject that interface and let infrastructure manage pooling, timeouts, transactions, and cleanup.',
      ],
      avoid: 'Do not manually open/close heavyweight resources inside business methods.',
    },
  ],
};

function renderFrameworkCases(entry) {
  const cases = COMMON_FRAMEWORK_CASES[entry.code] || [];
  if (!cases.length) return [];
  const lines = ['## Common framework cases', ''];
  for (const item of cases) {
    lines.push(`### ${item.title}`);
    lines.push('');
    lines.push(`**When you see this:** ${item.when}`);
    lines.push('');
    lines.push('**Do this:**');
    lines.push('');
    item.doThis.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('');
    lines.push(`**Avoid:** ${item.avoid}`);
    lines.push('');
  }
  return lines;
}

const CONCEPT_REFERENCES = [
  {
    id: 'layered-architecture',
    title: 'Layered architecture',
    link: '../concepts/layered-architecture.md',
    description: 'Understand controllers, services, repositories, entities, and why each layer has a narrow job.',
    keywords: ['controller', 'service', 'repository', 'entity', 'layer', 'layers', 'business logic', 'presentation', 'persistence'],
    applies: (entry) => /^RICA-V1|^RICA-V4|^RICA-V5/.test(entry.code),
  },
  {
    id: 'clean-architecture',
    title: 'Clean Architecture and dependency direction',
    link: '../concepts/clean-architecture.md',
    description: 'Learn why source dependencies should point inward and why framework details belong outside core code.',
    keywords: ['clean architecture', 'dependency direction', 'inward', 'outer', 'inner', 'domain', 'application'],
    applies: (entry) => /^RICA-V3|^RICA-V4|^RICA-V5/.test(entry.code),
  },
  {
    id: 'solid-principles',
    title: 'SOLID principles',
    link: '../concepts/solid-principles.md',
    description: 'Learn the object-oriented principles behind responsibility, extension, interface, and dependency violations.',
    keywords: ['single responsibility', 'solid', 'open closed', 'interface segregation', 'liskov', 'dependency inversion', 'responsibility'],
    applies: (entry) => /^RICA-V10|^RICA-V20|^RICA-V30/.test(entry.code),
  },
  {
    id: 'separation-of-concerns',
    title: 'Separation of concerns',
    link: '../concepts/separation-of-concerns.md',
    description: 'Learn why HTTP handling, business decisions, persistence, validation, and external calls should stay separate.',
    keywords: ['concern', 'responsibility', 'business logic', 'http', 'persistence', 'external', 'validation', 'error'],
    applies: (entry) => ['RICA-V106', 'RICA-V110', 'RICA-V114', 'RICA-V201', 'RICA-V202', 'RICA-V204', 'RICA-V501'].includes(entry.code),
  },
  {
    id: 'dependency-inversion',
    title: 'Dependency inversion',
    link: '../concepts/dependency-inversion.md',
    description: 'Learn why high-level policy should depend on interfaces instead of low-level implementation classes.',
    keywords: ['interface', 'abstraction', 'port', 'implementation', 'concrete', 'impl', 'dependency inversion'],
    applies: (entry) => /interface|abstraction|port|impl|implementation/i.test(entry.whyItMatters + ' ' + entry.trigger),
  },
  {
    id: 'dependency-injection',
    title: 'Dependency injection',
    link: '../concepts/dependency-injection.md',
    description: 'Understand constructor injection, field injection, containers, and why direct new calls are risky.',
    keywords: ['inject', 'injection', '@autowired', '@inject', '@resource', 'constructor', 'new', 'container', 'bean'],
    applies: (entry) => ['RICA-V101', 'RICA-V102', 'RICA-V103', 'RICA-V205', 'RICA-V320'].includes(entry.code),
  },
  {
    id: 'ports-and-adapters',
    title: 'Ports and Adapters',
    link: '../concepts/ports-and-adapters.md',
    description: 'Learn inbound ports, outbound ports, and adapter placement in hexagonal architecture.',
    keywords: ['port', 'adapter', 'gateway', 'inbound', 'outbound', 'hexagonal', 'interface', 'sdk', 'external'],
    applies: (entry) => ['RICA-V301', 'RICA-V307', 'RICA-V320', 'RICA-V322', 'RICA-V501'].includes(entry.code),
  },
  {
    id: 'controllers-services-repositories',
    title: 'Controllers, services, and repositories',
    link: '../concepts/controllers-services-repositories.md',
    description: 'See the practical difference between inbound HTTP handling, business workflows, and persistence access.',
    keywords: ['controller', 'service', 'repository', 'dao', 'http', 'business', 'workflow', 'persistence'],
    applies: (entry) => /^RICA-V10|^RICA-V11|^RICA-V40/.test(entry.code),
  },
  {
    id: 'repository-pattern',
    title: 'Repository pattern',
    link: '../concepts/repository-pattern.md',
    description: 'Learn what belongs in repositories and why query annotations belong at the persistence boundary.',
    keywords: ['repository', 'dao', 'query', '@query', '@modifying', '@param', 'jpa', 'jdbc', 'sql', 'persistence'],
    applies: (entry) => ['RICA-V102', 'RICA-V109', 'RICA-V114', 'RICA-V401', 'RICA-V402', 'RICA-V501'].includes(entry.code),
  },
  {
    id: 'service-layer-pattern',
    title: 'Service Layer pattern',
    link: '../concepts/service-layer-pattern.md',
    description: 'Learn why business use cases should be orchestrated in services rather than controllers or repositories.',
    keywords: ['service', 'use case', 'workflow', 'orchestration', 'business logic', 'transaction'],
    applies: (entry) => ['RICA-V103', 'RICA-V104', 'RICA-V106', 'RICA-V107', 'RICA-V204', 'RICA-V205', 'RICA-V310'].includes(entry.code),
  },
  {
    id: 'domain-model-vs-anemic-model',
    title: 'Domain model vs anemic model',
    link: '../concepts/domain-model-vs-anemic-model.md',
    description: 'Learn where domain invariants belong and when entities become too passive or too busy.',
    keywords: ['domain model', 'anemic', 'entity', 'invariant', 'state', 'business rule'],
    applies: (entry) => ['RICA-V106', 'RICA-V108', 'RICA-V204', 'RICA-V316'].includes(entry.code),
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    link: '../concepts/infrastructure.md',
    description: 'Learn what infrastructure means in RICA: databases, HTTP clients, message brokers, files, SDKs, and framework adapters.',
    keywords: ['infrastructure', 'database', 'sql', 'httpclient', 'resttemplate', 'webclient', 'sdk', 'framework', 'external', 'resource'],
    applies: (entry) => ['RICA-V110', 'RICA-V114', 'RICA-V301', 'RICA-V322', 'RICA-V501'].includes(entry.code),
  },
  {
    id: 'gateways-and-adapters',
    title: 'Gateways and adapters',
    link: '../concepts/gateways-and-adapters.md',
    description: 'Learn how gateway interfaces and adapter implementations isolate external APIs, SDKs, and protocols.',
    keywords: ['gateway', 'adapter', 'client', 'external service', 'sdk', 'resttemplate', 'webclient', 'httpclient', 'vendor'],
    applies: (entry) => ['RICA-V110', 'RICA-V301', 'RICA-V322'].includes(entry.code),
  },
  {
    id: 'entities-dtos-api-contracts',
    title: 'Entities, DTOs, and API contracts',
    link: '../concepts/entities-dtos-api-contracts.md',
    description: 'Understand why entities are internal models and DTOs are stable request/response contracts.',
    keywords: ['dto', 'entity', 'request', 'response', 'api', 'contract', 'serialization', 'json', 'validation'],
    applies: (entry) => /^RICA-V20/.test(entry.code),
  },
  {
    id: 'api-boundary-design',
    title: 'API boundary design',
    link: '../concepts/api-boundary-design.md',
    description: 'Learn request/response contracts, versioning, sensitive data leaks, and client-facing stability.',
    keywords: ['api', 'contract', 'request', 'response', 'dto', 'client', 'json', 'version', 'sensitive'],
    applies: (entry) => /^RICA-V20/.test(entry.code),
  },
  {
    id: 'validation-and-error-boundaries',
    title: 'Validation and error boundaries',
    link: '../concepts/validation-and-error-boundaries.md',
    description: 'Learn where validation, exception mapping, and HTTP error shape should live.',
    keywords: ['valid', 'validation', 'constraint', 'exception', 'error', 'controlleradvice', 'http status'],
    applies: (entry) => ['RICA-V203', 'RICA-V206', 'RICA-V207'].includes(entry.code),
  },
  {
    id: 'transaction-boundaries',
    title: 'Transaction boundaries',
    link: '../concepts/transaction-boundaries.md',
    description: 'Learn where transaction ownership usually belongs and why multi-step writes need explicit boundaries.',
    keywords: ['transaction', '@transactional', 'rollback', 'write', 'multi-step', 'command'],
    applies: (entry) => ['RICA-V106', 'RICA-V114', 'RICA-V204', 'RICA-V310'].includes(entry.code),
  },
  {
    id: 'framework-coupling',
    title: 'Framework coupling',
    link: '../concepts/framework-coupling.md',
    description: 'Learn when Spring, JPA, servlet, HTTP-client, and SDK imports leak framework concerns into the wrong layer.',
    keywords: ['spring', 'framework', 'jpa', 'servlet', 'responseentity', '@query', '@getmapping', 'sdk', 'httpclient'],
    applies: (entry) => ['RICA-V110', 'RICA-V114', 'RICA-V201', 'RICA-V202', 'RICA-V301', 'RICA-V501'].includes(entry.code),
  },
  {
    id: 'dependency-graphs-and-cycles',
    title: 'Dependency graphs and cycles',
    link: '../concepts/dependency-graphs-and-cycles.md',
    description: 'Learn cycles, inverted dependencies, fan-in, fan-out, and why graph rules matter.',
    keywords: ['graph', 'cycle', 'cyclic', 'inverted', 'fan-in', 'fan-out', 'dependency'],
    applies: (entry) => /^RICA-V40|RICA-V501/.test(entry.code),
  },
  {
    id: 'static-analysis-basics',
    title: 'Static analysis basics',
    link: '../concepts/static-analysis-basics.md',
    description: 'Learn how RICA detects source-code patterns and why some rules are heuristic.',
    keywords: ['static analysis', 'heuristic', 'detector', 'threshold', 'analyzer', 'false positive'],
    applies: (entry) => entry.stage === 'fallback' || /^RICA-V3/.test(entry.code),
  },
  {
    id: 'false-positives-and-rule-tuning',
    title: 'False positives and rule tuning',
    link: '../concepts/false-positives-and-rule-tuning.md',
    description: 'Learn how to decide whether a finding is a real violation or a configuration issue.',
    keywords: ['false positive', 'configuration', 'tuning', 'alloweddeps', 'threshold', 'package'],
    applies: (entry) => entry.code === 'RICA-V501' || entry.stage === 'fallback',
  },
  {
    id: 'refactoring-playbook',
    title: 'Refactoring playbook',
    link: '../concepts/refactoring-playbook.md',
    description: 'See practical refactoring moves for common RICA fixes.',
    keywords: ['refactor', 'extract', 'move', 'dto', 'gateway', 'repository', 'service', 'fix'],
    applies: (entry) => /^RICA-V1|^RICA-V2|^RICA-V3|^RICA-V5/.test(entry.code),
  },
  {
    id: 'spring-architecture-guide',
    title: 'Spring architecture guide',
    link: '../concepts/spring-architecture-guide.md',
    description: 'Learn Spring-specific placement for controllers, services, repositories, validation, transactions, and error handling.',
    keywords: ['spring', '@service', '@repository', '@restcontroller', '@transactional', '@valid', '@query', 'controlleradvice'],
    applies: (entry) => /^RICA-V1|^RICA-V2|RICA-V501/.test(entry.code),
  },
  {
    id: 'testing-architecture-fixes',
    title: 'Testing architecture fixes',
    link: '../concepts/testing-architecture-fixes.md',
    description: 'Learn which tests to run after moving logic, DTOs, SQL, gateways, or design-pattern behavior.',
    keywords: ['test', 'testing', 'verify', 'webmvctest', 'datajpatest', 'unit', 'integration'],
    applies: (entry) => ['RICA-V106', 'RICA-V110', 'RICA-V114', 'RICA-V201', 'RICA-V202', 'RICA-V303', 'RICA-V310', 'RICA-V501'].includes(entry.code),
  },
  {
    id: 'design-patterns',
    title: 'Design pattern basics',
    link: '../concepts/design-patterns.md',
    description: 'Learn what design patterns are, when they help, and when applying them creates accidental complexity.',
    keywords: ['pattern', 'factory', 'builder', 'strategy', 'observer', 'state', 'adapter', 'singleton', 'template'],
    applies: (entry) => /^RICA-V3/.test(entry.code),
  },
  {
    id: 'creational-patterns',
    title: 'Creational patterns',
    link: '../concepts/creational-patterns.md',
    description: 'Learn Factory, Builder, Singleton, and Prototype with Java examples and common misuse cases.',
    keywords: ['factory', 'builder', 'singleton', 'prototype', 'creation', 'constructor', 'new'],
    applies: (entry) => /factory|builder|singleton|prototype|constructor|new/i.test(entry.name + ' ' + entry.trigger + ' ' + entry.tags.join(' ')),
  },
  {
    id: 'structural-patterns',
    title: 'Structural patterns',
    link: '../concepts/structural-patterns.md',
    description: 'Learn Adapter, Facade, Proxy, Decorator, and Composite as ways to shape dependencies between objects.',
    keywords: ['adapter', 'facade', 'proxy', 'decorator', 'composite', 'wrapper', 'sdk'],
    applies: (entry) => /adapter|facade|proxy|decorator|composite|sdk|wrapper/i.test(entry.name + ' ' + entry.trigger + ' ' + entry.tags.join(' ')),
  },
  {
    id: 'behavioral-patterns',
    title: 'Behavioral patterns',
    link: '../concepts/behavioral-patterns.md',
    description: 'Learn Strategy, State, Observer, Command, and Template Method as ways to move behavior out of conditionals.',
    keywords: ['strategy', 'state', 'observer', 'command', 'template', 'conditional', 'branching', 'polymorphism'],
    applies: (entry) => /strategy|state|observer|command|template|conditional|branch|polymorphism/i.test(entry.name + ' ' + entry.trigger + ' ' + entry.tags.join(' ')),
  },
  {
    id: 'concurrency-boundaries',
    title: 'Concurrency and resource boundaries',
    link: '../concepts/concurrency-boundaries.md',
    description: 'Understand why threads, executors, sockets, connections, and heavyweight resources need ownership boundaries.',
    keywords: ['thread', 'executor', 'async', 'socket', 'connection', 'datasource', 'resource', 'lifecycle', 'pool'],
    applies: (entry) => ['RICA-V303', 'RICA-V304', 'RICA-V305', 'RICA-V322'].includes(entry.code),
  },
  {
    id: 'package-boundaries',
    title: 'Package boundaries',
    link: '../concepts/package-boundaries.md',
    description: 'Learn how Java packages express architectural ownership and why forbidden imports are meaningful.',
    keywords: ['package', 'import', 'boundary', 'forbidden', 'alloweddeps', 'dependency graph'],
    applies: (entry) => ['RICA-V401', 'RICA-V402', 'RICA-V403', 'RICA-V404', 'RICA-V501'].includes(entry.code),
  },
];

function renderConceptLinks(entry) {
  const text = [
    entry.code,
    entry.name,
    entry.layer,
    entry.trigger,
    entry.whyItMatters,
    entry.mitigationHint,
    ...(entry.howToFix || []),
    ...(entry.tags || []),
  ].join(' ').toLowerCase();

  const scored = CONCEPT_REFERENCES
    .map((concept, index) => {
      let score = concept.applies && concept.applies(entry) ? 8 : 0;
      for (const keyword of concept.keywords) {
        if (text.includes(keyword.toLowerCase())) score += 1;
      }
      return { concept, score, index };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6);

  if (!scored.length) return [];

  const lines = ['## Learn the concepts behind this rule', ''];
  lines.push('These background pages explain the architecture and pattern vocabulary used by this rule:');
  lines.push('');
  for (const { concept } of scored) {
    lines.push(`- [${concept.title}](${concept.link}) - ${concept.description}`);
  }
  lines.push('');
  return lines;
}

function renderViolationPage(entry) {
  const lines = [];
  lines.push(`# ${entry.code} — ${entry.name}`);
  lines.push('');
  lines.push(severityBadge(entry.severity));
  if (entry.severityContexts && entry.severityContexts.length) {
    const ctx = entry.severityContexts
      .map(s => `${severityBadge(s.severity)} ${s.context}`)
      .join(' ');
    lines.push(`\n> **Severity context**: ${ctx}`);
  }
  lines.push('');
  lines.push(`> **Stage**: ${entry.stageLabel}`);
  lines.push('');
  lines.push(`| | |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Detector | \`${entry.detector}\` (${entry.detectorSource}) |`);
  lines.push(`| Layer | ${entry.layer} |`);
  lines.push(`| Configuration | ${entry.configKey ? '`' + entry.configKey + '`' : 'Not configurable (always on)'} |`);
  lines.push(`| Related rules | ${entry.relatedRules.length ? entry.relatedRules.map(r => `[\`${r}\`](./${r}.md)`).join(', ') : '—'} |`);
  lines.push(`| Source | ${'`' + entry.sourceRef + '`'} |`);
  lines.push('');

  lines.push('## Trigger');
  lines.push('');
  lines.push(entry.trigger);
  lines.push('');

  if (entry.beforeCode) {
    lines.push('### Violating example');
    lines.push('');
    lines.push(fence(entry.beforeCode));
    lines.push('');
  }
  if (entry.afterCode) {
    lines.push('### Fixed version');
    lines.push('');
    lines.push(fence(entry.afterCode));
    lines.push('');
  }

  if (entry.beforeCode && entry.afterCode) {
    lines.push('## What changed');
    lines.push('');
    lines.push('The highlighted diff below shows the real refactor: lines marked with `-` are removed from the violating version, and lines marked with `+` are added in the fixed version.');
    lines.push('');
    lines.push(renderDiff(entry.beforeCode, entry.afterCode));
    lines.push('');
  }

  lines.push('## Why it matters');
  lines.push('');
  lines.push(entry.whyItMatters);
  lines.push('');

  lines.push(...renderConceptLinks(entry));

  lines.push(...renderFrameworkCases(entry));

  lines.push('## How to fix');
  lines.push('');
  lines.push('Use this as the practical checklist. Each item explains both the action and the reason behind it.');
  lines.push('');
  entry.howToFix.forEach((step, i) => {
    lines.push(`${i + 1}. **${step}**`);
    lines.push(`   ${explainStep(step, entry)}`);
  });
  lines.push('');

  lines.push('## How to verify');
  lines.push('');
  lines.push('1. Re-run RICA on the changed file or project.');
  lines.push(`2. Confirm ${entry.code} no longer appears at the same location.`);
  lines.push('3. Run the project tests for the changed feature, because architecture fixes should preserve behavior.');
  lines.push('');

  lines.push('## Mitigation hint');
  lines.push('');
  lines.push(`> ${entry.mitigationHint}`);
  lines.push('');

  if (entry.tags && entry.tags.length) {
    lines.push('## Tags');
    lines.push('');
    lines.push(entry.tags.map(t => `\`${t}\``).join(' '));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`_This page is generated from \`src/violationCatalog.ts\` by \`scripts/generate-docs.cjs\`. Do not edit by hand._`);
  lines.push('');
  return lines.join('\n');
}

function renderRuleMatrix(entries) {
  const lines = [];
  lines.push('# RICA Violation Code Reference');
  lines.push('');
  lines.push(
    'Every code the analyzers can emit, generated from the single source of truth ' +
    '`src/violationCatalog.ts`. Click a code for the full page (trigger, rationale, fix steps, examples).',
  );
  lines.push('');

  const byStage = new Map();
  for (const e of entries) {
    if (!byStage.has(e.stage)) byStage.set(e.stage, []);
    byStage.get(e.stage).push(e);
  }

  for (const stage of STAGE_ORDER) {
    const group = byStage.get(stage);
    if (!group) continue;
    lines.push(`## ${group[0].stageLabel}`);
    lines.push('');
    lines.push('| Code | Name | Severity | Layer | Config |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const e of group) {
      const sevCtx =
        e.severityContexts && e.severityContexts.length
          ? e.severityContexts.map(s => s.severity).join('/')
          : e.severity;
      lines.push(
        `| [${e.code}](./violations/${e.code}.md) | ${e.name} | ${sevCtx} | ${e.layer} | ${e.configKey ? '`' + e.configKey + '`' : 'always on'} |`,
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    'This page is generated from `src/violationCatalog.ts` by `scripts/generate-docs.cjs`. Run `npm run generate:docs` to regenerate.',
  );
  lines.push('');
  return lines.join('\n');
}

function sortedEntries(catalog) {
  return Object.values(catalog.VIOLATION_DOC_BY_CODE).sort((a, b) =>
    a.code.localeCompare(b.code),
  );
}

function renderAll(catalog) {
  const pages = new Map();
  for (const entry of sortedEntries(catalog)) {
    pages.set(path.join(VIOLATIONS_DIR, `${entry.code}.md`), renderViolationPage(entry));
  }
  pages.set(RULE_MATRIX_PATH, renderRuleMatrix(sortedEntries(catalog)));
  return pages;
}

function main() {
  const catalog = loadCatalog();
  const verifyOnly = process.argv.includes('--verify');

  if (!catalog.VIOLATION_DOC_BY_CODE) {
    console.error('[generate-docs] Catalog exports missing VIOLATION_DOC_BY_CODE.');
    process.exit(1);
  }

  const pages = renderAll(catalog);
  let drift = false;

  for (const [filePath, content] of pages) {
    if (verifyOnly) {
      let existing = '';
      try {
        existing = fs.readFileSync(filePath, 'utf8');
      } catch (_) { /* missing file */ }
      if (existing !== content) {
        drift = true;
        console.error(`[docs:verify] Out of date: ${path.relative(ROOT, filePath)}`);
      }
    } else {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  if (verifyOnly) {
    if (drift) {
      console.error('[docs:verify] Docs are out of sync with src/violationCatalog.ts. Run: npm run generate:docs');
      process.exit(1);
    }
    console.log(`[docs:verify] Docs are in sync (${pages.size} files).`);
    process.exit(0);
  }

  console.log(`[generate-docs] Wrote ${pages.size} files (${VIOLATIONS_DIR}, rule-matrix).`);
}

main();
