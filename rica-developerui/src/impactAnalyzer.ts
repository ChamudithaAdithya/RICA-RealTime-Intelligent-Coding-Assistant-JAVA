import { FullASTOutput } from './astTypes';

export interface InvalidationMaps {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export class ImpactAnalyzer {
  /**
   * Computes the full transitive blast radius of a file change.
   * Returns the set of all files (excluding `changedFilePath` itself)
   * that depend (directly or transitively) on the changed file.
   */
  public static computeBlastRadius(
    changedFilePath: string,
    maps: InvalidationMaps,
  ): Set<string> {
    const affected = new Set<string>();
    const queue: string[] = [changedFilePath];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const upstream = maps.dependents.get(current);
      if (!upstream) continue;

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
  public static buildFromAstMap(
    files: Record<string, FullASTOutput>,
  ): InvalidationMaps {
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, Set<string>>();

    for (const [filePath, ast] of Object.entries(files)) {
      const deps = new Set<string>();
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
        dependents.get(dep)!.add(filePath);
      }
    }

    return { dependencies, dependents };
  }

  /**
   * Patch maps when a file changes.
   *
   * Outgoing edges of the changed file are rebuilt from its new AST. Incoming
   * edges (other files depending on this one) are RECOMPUTED from every other
   * file's imports/relationships against the classes the NEW ast defines —
   * blindly deleting them corrupted later blast-radius calculations because a
   * dependent file's own imports did not change and must keep pointing here.
   */
  public static updateMapsForFile(
    filePath: string,
    _oldAst: FullASTOutput | undefined,
    newAst: FullASTOutput,
    files: Record<string, FullASTOutput>,
    maps: InvalidationMaps,
  ): void {
    // 1. Remove old OUTGOING edges of the changed file
    const oldDeps = maps.dependencies.get(filePath);
    if (oldDeps) {
      for (const dep of oldDeps) {
        const depSet = maps.dependents.get(dep);
        if (depSet) {
          depSet.delete(filePath);
          if (depSet.size === 0) maps.dependents.delete(dep);
        }
      }
    }

    // 2. Recompute INCOMING edges from scratch: scan every other file and check
    //    whether any import/relationship still resolves into the new AST.
    const definedClasses = new Set<string>();
    for (const cls of newAst.classes || []) {
      definedClasses.add(cls.fullyQualifiedName);
      definedClasses.add(cls.className);
    }

    const newDependents = new Set<string>();
    for (const [fp, ast] of Object.entries(files)) {
      if (fp === filePath || fp === 'error') continue;
      let depends = false;
      for (const imp of ast.imports || []) {
        if (!imp.isWildcard && imp.qualifiedName && definedClasses.has(imp.qualifiedName)) {
          depends = true;
          break;
        }
      }
      if (!depends) {
        for (const rel of ast.relationships || []) {
          const simple = rel.targetId.split('.').pop() || rel.targetId;
          if (definedClasses.has(rel.targetId) || definedClasses.has(simple)) {
            depends = true;
            break;
          }
        }
      }
      if (depends) newDependents.add(fp);
    }

    // 3. Sync dependents sets with the recomputed truth
    const oldDependents = maps.dependents.get(filePath) || new Set<string>();
    for (const parent of oldDependents) {
      if (!newDependents.has(parent)) {
        maps.dependencies.get(parent)?.delete(filePath);
      }
    }
    for (const parent of newDependents) {
      if (!oldDependents.has(parent)) {
        if (!maps.dependencies.has(parent)) maps.dependencies.set(parent, new Set());
        maps.dependencies.get(parent)!.add(filePath);
      }
    }
    if (newDependents.size > 0) {
      maps.dependents.set(filePath, newDependents);
    } else {
      maps.dependents.delete(filePath);
    }

    // 4. Store new OUTGOING edges
    const newDeps = new Set<string>();
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
    if (newDeps.size > 0) {
      maps.dependencies.set(filePath, newDeps);
      for (const dep of newDeps) {
        if (!maps.dependents.has(dep)) {
          maps.dependents.set(dep, new Set());
        }
        maps.dependents.get(dep)!.add(filePath);
      }
    } else {
      maps.dependencies.delete(filePath);
    }
  }

  /**
   * Compute a signature hash for the public API of a parsed AST.
   * Two ASTs with equal hashes expose identical public surfaces.
   */
  public static computeSignatureHash(ast: FullASTOutput): string {
    const parts: string[] = [];
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

  public static signatureChanged(
    oldAst: FullASTOutput | undefined,
    newAst: FullASTOutput,
  ): boolean {
    if (!oldAst) return true;
    return ImpactAnalyzer.computeSignatureHash(oldAst) !== ImpactAnalyzer.computeSignatureHash(newAst);
  }

  /**
   * Remove a file's entry from maps (on deletion).
   */
  public static removeFileFromMaps(
    filePath: string,
    maps: InvalidationMaps,
  ): void {
    const oldDeps = maps.dependencies.get(filePath);
    if (oldDeps) {
      for (const dep of oldDeps) {
        const depSet = maps.dependents.get(dep);
        if (depSet) {
          depSet.delete(filePath);
          if (depSet.size === 0) maps.dependents.delete(dep);
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

  private static resolveImportToFile(
    qualifiedName: string,
    files: Record<string, FullASTOutput>,
  ): string | undefined {
    for (const [fp, ast] of Object.entries(files)) {
      if (fp === 'error') continue;
      for (const cls of ast.classes || []) {
        if (cls.fullyQualifiedName === qualifiedName) {
          return fp;
        }
      }
    }
    return undefined;
  }

  private static findFileForClass(
    className: string,
    files: Record<string, FullASTOutput>,
  ): string | undefined {
    for (const [fp, ast] of Object.entries(files)) {
      if (fp === 'error') continue;
      for (const cls of ast.classes || []) {
        if (cls.fullyQualifiedName === className || cls.className === className) {
          return fp;
        }
      }
    }
    return undefined;
  }
}