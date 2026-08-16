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
    lines.push('### Before (violates)');
    lines.push('');
    lines.push(fence(entry.beforeCode));
    lines.push('');
  }
  if (entry.afterCode) {
    lines.push('### After (fixed)');
    lines.push('');
    lines.push(fence(entry.afterCode));
    lines.push('');
  }

  lines.push('## Why it matters');
  lines.push('');
  lines.push(entry.whyItMatters);
  lines.push('');

  lines.push('## How to fix');
  lines.push('');
  entry.howToFix.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
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