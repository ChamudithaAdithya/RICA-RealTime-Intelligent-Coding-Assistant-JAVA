"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LAYER_MAP = {
    'domain': 'domain',
    'application': 'application',
    'infrastructure': 'infrastructure',
    'types': 'domain',
};
const LAYER_RULES = {
    'domain': { allowedImports: ['domain'] },
    'application': { allowedImports: ['domain', 'application'] },
    'infrastructure': { allowedImports: ['domain', 'application', 'infrastructure'] },
};
const SRC_DIR = path.resolve(__dirname, '..');
const ALLOWED_EXTENSIONS = ['.ts'];
function getLayerForFile(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    for (const [dir, layer] of Object.entries(LAYER_MAP)) {
        if (parts.includes(dir)) {
            return layer;
        }
    }
    return 'presentation';
}
function resolveImport(sourceFile, importPath, projectFiles) {
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
function findTsFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            results.push(...findTsFiles(fullPath));
        }
        else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            results.push(fullPath);
        }
    }
    return results;
}
function extractImports(content) {
    const imports = [];
    const lines = content.split('\n');
    const re = /(?:from\s+['"](\..*?)['"]|require\(['"](\..*?)['"]\))/g;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('import ') && !line.startsWith('const ') && !line.includes('require('))
            continue;
        if (/^import\s+type\b/.test(line))
            continue;
        let match;
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
    const violations = [];
    for (const file of tsFiles) {
        const sourceLayer = getLayerForFile(file);
        if (!sourceLayer)
            continue;
        const content = fs.readFileSync(file, 'utf-8');
        const relativeFile = path.relative(SRC_DIR, file).replace(/\\/g, '/');
        const imports = extractImports(content);
        for (const imp of imports) {
            const resolved = resolveImport(file, imp.rawPath, tsFiles);
            if (!resolved.fullPath || !resolved.layer)
                continue;
            const targetLayer = resolved.layer;
            if (targetLayer === sourceLayer)
                continue;
            // Get rules for this layer
            const rule = LAYER_RULES[sourceLayer];
            if (!rule)
                continue; // presentation layer has no restrictions
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
    }
    else {
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
//# sourceMappingURL=ricaLayerCheck.js.map