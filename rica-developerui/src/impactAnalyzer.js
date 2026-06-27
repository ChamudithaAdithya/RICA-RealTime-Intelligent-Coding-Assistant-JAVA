"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImpactAnalyzer = void 0;
class ImpactAnalyzer {
    /**
     * Computes the full transitive blast radius of a file change.
     * Returns the set of all files (excluding `changedFilePath` itself)
     * that depend (directly or transitively) on the changed file.
     */
    static computeBlastRadius(changedFilePath, maps) {
        const affected = new Set();
        const queue = [changedFilePath];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            const upstream = maps.dependents.get(current);
            if (!upstream)
                continue;
            for (const dep of upstream) {
                if (!affected.has(dep)) {
                    affected.add(dep);
                    queue.push(dep);
                }
            }
        }
        affected.delete(changedFilePath);
        return affected;
    }
    /**
     * Builds bidirectional maps from a full dependency graph representation.
     * Each entry maps file path to a set of file paths it directly depends on / is depended by.
     */
    static buildFromAstMap(files) {
        const dependencies = new Map();
        const dependents = new Map();
        for (const [filePath, ast] of Object.entries(files)) {
            const deps = new Set();
            for (const imp of ast.imports || []) {
                if (!imp.isWildcard && imp.qualifiedName) {
                    const depFile = ImpactAnalyzer.resolveImportToFile(imp.qualifiedName, files);
                    if (depFile && depFile !== filePath) {
                        deps.add(depFile);
                    }
                }
            }
            for (const rel of ast.relationships || []) {
                const targetFile = ImpactAnalyzer.findFileForClass(rel.targetId, files);
                if (targetFile && targetFile !== filePath) {
                    deps.add(targetFile);
                }
            }
            dependencies.set(filePath, deps);
            for (const dep of deps) {
                if (!dependents.has(dep)) {
                    dependents.set(dep, new Set());
                }
                dependents.get(dep).add(filePath);
            }
        }
        return { dependencies, dependents };
    }
    /**
     * Patch maps when a file changes. Removes old edges and adds new ones.
     */
    static updateMapsForFile(filePath, oldAst, newAst, files, maps) {
        // Remove old outgoing edges
        const oldDeps = maps.dependencies.get(filePath);
        if (oldDeps) {
            for (const dep of oldDeps) {
                const depSet = maps.dependents.get(dep);
                if (depSet) {
                    depSet.delete(filePath);
                    if (depSet.size === 0)
                        maps.dependents.delete(dep);
                }
            }
        }
        // Remove old incoming edges (other files that depended on this file)
        const oldDependents = maps.dependents.get(filePath);
        if (oldDependents) {
            for (const parentFile of oldDependents) {
                const parentDeps = maps.dependencies.get(parentFile);
                if (parentDeps) {
                    parentDeps.delete(filePath);
                }
            }
        }
        // Clear old entries
        maps.dependencies.delete(filePath);
        maps.dependents.delete(filePath);
        // Compute new dependencies
        const newDeps = new Set();
        for (const imp of newAst.imports || []) {
            if (!imp.isWildcard && imp.qualifiedName) {
                const depFile = ImpactAnalyzer.resolveImportToFile(imp.qualifiedName, files);
                if (depFile && depFile !== filePath) {
                    newDeps.add(depFile);
                }
            }
        }
        for (const rel of newAst.relationships || []) {
            const targetFile = ImpactAnalyzer.findFileForClass(rel.targetId, files);
            if (targetFile && targetFile !== filePath) {
                newDeps.add(targetFile);
            }
        }
        // Store new edges
        if (newDeps.size > 0) {
            maps.dependencies.set(filePath, newDeps);
            for (const dep of newDeps) {
                if (!maps.dependents.has(dep)) {
                    maps.dependents.set(dep, new Set());
                }
                maps.dependents.get(dep).add(filePath);
            }
        }
    }
    /**
     * Compute a signature hash for the public API of a parsed AST.
     * Returns null if unchanged (same as previous hash).
     */
    static computeSignatureHash(ast) {
        const parts = [];
        for (const cls of ast.classes || []) {
            parts.push(cls.className);
            parts.push(cls.fullyQualifiedName);
            parts.push(cls.detectedLayer || 'unknown');
            parts.push(cls.accessModifier || 'public');
            parts.push(cls.superClass || '');
            parts.push(...(cls.interfaces || []).sort());
            // Public method signatures
            for (const m of cls.methods || []) {
                if (m.accessModifier === 'public' || m.accessModifier === 'protected') {
                    parts.push(`${m.name}:${m.returnType}(${m.parameters.map(p => p.dataType).join(',')})`);
                }
            }
            // Public field signatures
            for (const f of cls.attributes || []) {
                if (f.accessModifier === 'public' || f.accessModifier === 'protected') {
                    parts.push(`${f.name}:${f.dataType}`);
                }
            }
        }
        return parts.join('|');
    }
    static signatureChanged(oldAst, newAst) {
        if (!oldAst)
            return true;
        return ImpactAnalyzer.computeSignatureHash(oldAst) !== ImpactAnalyzer.computeSignatureHash(newAst);
    }
    /**
     * Remove a file's entry from maps (on deletion).
     */
    static removeFileFromMaps(filePath, maps) {
        const oldDeps = maps.dependencies.get(filePath);
        if (oldDeps) {
            for (const dep of oldDeps) {
                const depSet = maps.dependents.get(dep);
                if (depSet) {
                    depSet.delete(filePath);
                    if (depSet.size === 0)
                        maps.dependents.delete(dep);
                }
            }
        }
        const oldDependents = maps.dependents.get(filePath);
        if (oldDependents) {
            for (const parentFile of oldDependents) {
                const parentDeps = maps.dependencies.get(parentFile);
                if (parentDeps) {
                    parentDeps.delete(filePath);
                }
            }
        }
        maps.dependencies.delete(filePath);
        maps.dependents.delete(filePath);
    }
    static resolveImportToFile(qualifiedName, files) {
        for (const [fp, ast] of Object.entries(files)) {
            if (fp === 'error')
                continue;
            for (const cls of ast.classes || []) {
                if (cls.fullyQualifiedName === qualifiedName) {
                    return fp;
                }
            }
        }
        return undefined;
    }
    static findFileForClass(className, files) {
        for (const [fp, ast] of Object.entries(files)) {
            if (fp === 'error')
                continue;
            for (const cls of ast.classes || []) {
                if (cls.fullyQualifiedName === className || cls.className === className) {
                    return fp;
                }
            }
        }
        return undefined;
    }
}
exports.ImpactAnalyzer = ImpactAnalyzer;
//# sourceMappingURL=impactAnalyzer.js.map