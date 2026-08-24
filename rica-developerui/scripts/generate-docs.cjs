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
