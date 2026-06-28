/**
 * Standalone layer boundary checker for RICA's own TypeScript codebase.
 * Scans src/ for cross-layer import violations and reports them.
 *
 * Usage: npx ts-node src/ricaLayerCheck.ts
 *        node src/ricaLayerCheck.js
 *
 * Layer rules (Clean Architecture):
 *   domain/        → nothing (zero deps)
 *   application/   → domain only
 *   infrastructure → domain, application
 *   src/ root      → anything (presentation / composition root)
 *   types/         → domain only
 */

import * as fs from 'fs';
import * as path from 'path';

interface LayerRule {
  allowedImports: string[];     // layer names allowed to import FROM
}

const LAYER_MAP: Record<string, string> = {
  'domain': 'domain',
  'application': 'application',
  'infrastructure': 'infrastructure',
  'types': 'domain',
};

const LAYER_RULES: Record<string, LayerRule> = {
  'domain': { allowedImports: ['domain'] },
  'application': { allowedImports: ['domain', 'application'] },
  'infrastructure': { allowedImports: ['domain', 'application', 'infrastructure'] },
};

const SRC_DIR = path.resolve(__dirname, '..');
const ALLOWED_EXTENSIONS = ['.ts'];

interface ImportViolation {
  file: string;
  line: number;
  sourceLayer: string;
  targetPath: string;
  targetLayer: string;
  message: string;
}

interface ResolvedImport {
  fullPath: string | null;
  layer: string | null;
}

function getLayerForFile(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  for (const [dir, layer] of Object.entries(LAYER_MAP)) {
    if (parts.includes(dir)) {
      return layer;
    }
  }
  return 'presentation';
}

function resolveImport(
  sourceFile: string,
  importPath: string,
  projectFiles: string[]
): ResolvedImport {
  const sourceDir = path.dirname(sourceFile);
  const resolved = path.resolve(sourceDir, importPath);

  for (const ext of ALLOWED_EXTENSIONS) {
    const withExt = resolved + ext;
    if (projectFiles.includes(withExt)) {
      return { fullPath: withExt, layer: getLayerForFile(withExt) };
    }
  }

  const dirPath = resolved;
  for (const ext of ALLOWED_EXTENSIONS) {
    const indexPath = path.join(dirPath, 'index' + ext);
    if (projectFiles.includes(indexPath)) {
      return { fullPath: indexPath, layer: getLayerForFile(indexPath) };
    }
  }

  return { fullPath: null, layer: null };
}

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractImports(content: string): { rawPath: string; line: number }[] {
  const imports: { rawPath: string; line: number }[] = [];
  const lines = content.split('\n');
  const re = /(?:from\s+['"](\..*?)['"]|require\(['"](\..*?)['"]\))/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('import ') && !line.startsWith('const ') && !line.includes('require(')) continue;

    let match: RegExpExecArray | null;
    const localRe = new RegExp(re.source, 'g');
    while ((match = localRe.exec(line)) !== null) {
      const p = match[1] || match[2];
      if (p) {
        imports.push({ rawPath: p, line: i + 1 });
      }
    }
  }
  return imports;
}

function check() {
  const tsFiles = findTsFiles(SRC_DIR).filter(f => !f.includes('node_modules'));
  const violations: ImportViolation[] = [];

  for (const file of tsFiles) {
    const sourceLayer = getLayerForFile(file);
    if (!sourceLayer) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const relativeFile = path.relative(SRC_DIR, file).replace(/\\/g, '/');

    const imports = extractImports(content);
    for (const imp of imports) {
      const resolved = resolveImport(file, imp.rawPath, tsFiles);
      if (!resolved.fullPath || !resolved.layer) continue;

      const targetLayer = resolved.layer;
      if (targetLayer === sourceLayer) continue;

      // Get rules for this layer
      const rule = LAYER_RULES[sourceLayer];
      if (!rule) continue; // presentation layer has no restrictions

      if (!rule.allowedImports.includes(targetLayer)) {
        violations.push({
          file: relativeFile,
          line: imp.line,
          sourceLayer,
          targetPath: path.relative(SRC_DIR, resolved.fullPath).replace(/\\/g, '/'),
          targetLayer,
          message: `Layer '${sourceLayer}' → '${targetLayer}' not allowed. Allowed: [${rule.allowedImports.join(', ')}]`,
        });
      }
    }
  }

  if (violations.length === 0) {
    console.log('✓ No cross-layer import violations found.');
    process.exit(0);
  } else {
    console.log(`\n✗ Found ${violations.length} cross-layer import violation(s):\n`);
    for (const v of violations) {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`    ${v.message}`);
      console.log(`    Imports from: ${v.targetPath} (${v.targetLayer})`);
      console.log();
    }
    process.exit(1);
  }
}

check();
