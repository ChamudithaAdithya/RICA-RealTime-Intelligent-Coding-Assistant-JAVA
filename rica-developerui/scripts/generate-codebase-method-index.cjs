const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outFile = path.join(root, 'docs', 'codebase-method-index.md');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, acc);
    } else if (/\.(ts|js)$/.test(entry.name) && !entry.name.endsWith('.map')) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function isGeneratedJs(file) {
  if (!file.endsWith('.js')) return false;
  if (rel(file).startsWith('src/test/')) return false;
  const ts = file.replace(/\.js$/, '.ts');
  return fs.existsSync(ts);
}

function classify(file) {
  const r = rel(file);
  if (r.startsWith('src/test/')) return 'hand-written test/support file';
  if (isGeneratedJs(file)) return 'compiled JavaScript output';
  if (file.endsWith('.ts')) return 'TypeScript source';
  return 'JavaScript source/support file';
}

function detectSignatures(lines) {
  const signatures = [];
  const patterns = [
    /^\s*export\s+class\s+([A-Za-z0-9_]+)/,
    /^\s*class\s+([A-Za-z0-9_]+)/,
    /^\s*export\s+interface\s+([A-Za-z0-9_]+)/,
    /^\s*interface\s+([A-Za-z0-9_]+)/,
    /^\s*export\s+type\s+([A-Za-z0-9_]+)/,
    /^\s*export\s+function\s+([A-Za-z0-9_]+)\s*\(/,
    /^\s*function\s+([A-Za-z0-9_]+)\s*\(/,
    /^\s*export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/,
    /^\s*async\s+function\s+([A-Za-z0-9_]+)\s*\(/,
    /^\s*(public|private|protected)?\s*(async\s+)?([A-Za-z0-9_]+)\s*\([^;]*\)\s*[:{]/,
    /^\s*(const|let)\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/
  ];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[3] || match[2] || match[1] || 'anonymous';
        signatures.push({
          line: index + 1,
          name,
          signature: trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed
        });
        break;
      }
    }
  });

  return signatures;
}

const sourceFiles = walk(path.join(root, 'src'))
  .filter(file => !isGeneratedJs(file) && !file.endsWith('.map'))
  .sort((a, b) => rel(a).localeCompare(rel(b)));

const generatedJsFiles = walk(path.join(root, 'src'))
  .filter(isGeneratedJs)
  .sort((a, b) => rel(a).localeCompare(rel(b)));

let md = '';
md += '# RICA Codebase Method Index\n\n';
md += 'This file is generated from the repository source. It lists real TypeScript source files and hand-written JavaScript test files, with line counts and detected declarations. Use it together with `docs/codebase-understanding.md`.\n\n';
md += 'Generated JavaScript files are listed separately at the end because they are compiled output from TypeScript, not the implementation you normally explain in defence.\n\n';

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const signatures = detectSignatures(lines);
  md += `## ${rel(file)}\n\n`;
  md += `Type: ${classify(file)}  \n`;
  md += `Lines: ${lines.length}\n\n`;
  if (signatures.length === 0) {
    md += 'No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.\n\n';
    continue;
  }
  md += '| Line | Declaration |\n';
  md += '|---:|---|\n';
  for (const sig of signatures) {
    md += `| ${sig.line} | \`${sig.signature.replace(/`/g, '\\`')}\` |\n`;
  }
  md += '\n';
}

md += '## Compiled JavaScript Outputs\n\n';
md += 'These files are generated from matching `.ts` files by `npm run compile`. They are used by VS Code/package runtime, but the TypeScript source is the version to study and explain.\n\n';
md += '| Generated file | Source file |\n';
md += '|---|---|\n';
for (const file of generatedJsFiles) {
  md += `| \`${rel(file)}\` | \`${rel(file).replace(/\.js$/, '.ts')}\` |\n`;
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, md);
console.log(outFile);
