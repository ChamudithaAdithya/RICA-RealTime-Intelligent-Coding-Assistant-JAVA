import { FullASTOutput } from '../astTypes';

export interface InvalidationMaps {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export interface AstChangeImpact {
  publicSignatureChanged: boolean;
  classStructureChanged: boolean;
  importsChanged: boolean;
  relationshipsChanged: boolean;
  methodCallsChanged: boolean;
  objectCreationsChanged: boolean;
  fieldsChanged: boolean;
  annotationsChanged: boolean;
  methodComplexityChanged: boolean;
  suppressionsChanged: boolean;
  anySemanticChange: boolean;
}

export class ImpactAnalyzer {
  public static diffAstFacts(
    oldAst: FullASTOutput | undefined,
    newAst: FullASTOutput,
  ): AstChangeImpact {
    if (!oldAst) {
      return {
        publicSignatureChanged: true,
        classStructureChanged: true,
        importsChanged: true,
        relationshipsChanged: true,
        methodCallsChanged: true,
        objectCreationsChanged: true,
        fieldsChanged: true,
        annotationsChanged: true,
        methodComplexityChanged: true,
        suppressionsChanged: true,
        anySemanticChange: true,
      };
    }

    const impact: AstChangeImpact = {
      publicSignatureChanged: ImpactAnalyzer.signatureChanged(oldAst, newAst),
      classStructureChanged: ImpactAnalyzer.hashClassStructure(oldAst) !== ImpactAnalyzer.hashClassStructure(newAst),
      importsChanged: ImpactAnalyzer.hashImports(oldAst) !== ImpactAnalyzer.hashImports(newAst),
      relationshipsChanged: ImpactAnalyzer.hashRelationships(oldAst) !== ImpactAnalyzer.hashRelationships(newAst),
      methodCallsChanged: ImpactAnalyzer.hashMethodCalls(oldAst) !== ImpactAnalyzer.hashMethodCalls(newAst),
      objectCreationsChanged: ImpactAnalyzer.hashObjectCreations(oldAst) !== ImpactAnalyzer.hashObjectCreations(newAst),
      fieldsChanged: ImpactAnalyzer.hashFields(oldAst) !== ImpactAnalyzer.hashFields(newAst),
      annotationsChanged: ImpactAnalyzer.hashAnnotations(oldAst) !== ImpactAnalyzer.hashAnnotations(newAst),
      methodComplexityChanged: ImpactAnalyzer.hashMethodComplexity(oldAst) !== ImpactAnalyzer.hashMethodComplexity(newAst),
      suppressionsChanged: ImpactAnalyzer.stableStringify(oldAst.suppressedLines || {}) !== ImpactAnalyzer.stableStringify(newAst.suppressedLines || {}),
      anySemanticChange: false,
    };

    impact.anySemanticChange = Object.entries(impact)
      .some(([key, value]) => key !== 'anySemanticChange' && value === true);
    return impact;
  }

  public static graphInputsChanged(impact: AstChangeImpact): boolean {
    return impact.classStructureChanged
      || impact.importsChanged
      || impact.relationshipsChanged
      || impact.methodCallsChanged;
  }

  public static packageBoundaryInputsChanged(impact: AstChangeImpact): boolean {
    return impact.classStructureChanged
      || impact.importsChanged
      || impact.relationshipsChanged
      || impact.annotationsChanged;
  }

  public static localRuleInputsChanged(impact: AstChangeImpact): boolean {
    return impact.fieldsChanged
      || impact.annotationsChanged
      || impact.methodCallsChanged
      || impact.objectCreationsChanged
      || impact.methodComplexityChanged
      || impact.suppressionsChanged
      || impact.publicSignatureChanged;
  }

  public static designPatternRulesForChange(impact: AstChangeImpact): string[] {
    const rules = new Set<string>();
    const add = (...items: string[]) => items.forEach(item => rules.add(item));

    if (impact.importsChanged) {
      add('missing-adapter');
    }
    if (impact.fieldsChanged || impact.annotationsChanged) {
      add('mutable-singleton', 'service-locator', 'missing-proxy');
    }
    if (impact.classStructureChanged || impact.publicSignatureChanged) {
      add(
        'missing-abstraction',
        'missing-adapter',
        'missing-factory',
        'fat-interface',
        'fragmented-factories',
        'missing-proxy',
        'missing-bridge',
      );
    }
    if (impact.methodCallsChanged) {
      add(
        'god-facade',
        'fat-interface',
        'missing-prototype',
        'missing-decorator',
        'duplicate-algorithm',
        'hardcoded-notifier',
        'service-locator',
        'missing-proxy',
      );
    }
    if (impact.objectCreationsChanged) {
      add(
        'raw-thread',
        'missing-factory',
        'leaking-construction',
        'missing-command',
        'redundant-memory',
        'missing-proxy',
      );
    }
    if (impact.methodComplexityChanged) {
      add(
        'missing-strategy',
        'missing-command',
        'missing-composite',
        'scattered-state-machine',
        'monolithic-pipeline',
        'excessive-null-checks',
      );
    }

    return Array.from(rules);
  }

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

  private static hashImports(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.imports || []).map(imp => ({
      q: imp.qualifiedName,
      static: imp.isStatic,
      wildcard: imp.isWildcard,
    })).sort((a, b) => a.q.localeCompare(b.q)));
  }

  private static hashRelationships(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.relationships || []).map(rel => ({
      source: rel.sourceId,
      target: rel.targetId,
      type: rel.type,
      line: rel.metadata?.line || 0,
    })).sort((a, b) => `${a.source}|${a.target}|${a.type}`.localeCompare(`${b.source}|${b.target}|${b.type}`)));
  }

  private static hashClassStructure(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.classes || []).map(cls => ({
      name: cls.className,
      fqn: cls.fullyQualifiedName,
      type: cls.classType,
      layer: cls.detectedLayer,
      access: cls.accessModifier,
      abstract: cls.isAbstract,
      final: cls.isFinal,
      super: cls.superClass,
      interfaces: [...(cls.interfaces || [])].sort(),
      methods: (cls.methods || []).map(method => ({
        name: method.name,
        access: method.accessModifier,
        type: method.methodType,
        returnType: method.returnType,
        params: (method.parameters || []).map(param => param.dataType),
      })).sort((a, b) => `${a.name}|${a.returnType}|${a.params.join(',')}`.localeCompare(`${b.name}|${b.returnType}|${b.params.join(',')}`)),
    })).sort((a, b) => a.fqn.localeCompare(b.fqn)));
  }

  private static hashFields(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.classes || []).flatMap(cls =>
      (cls.attributes || []).map(field => ({
        owner: cls.fullyQualifiedName,
        name: field.name,
        type: field.dataType,
        access: field.accessModifier,
        static: field.isStatic,
        final: field.isFinal,
        injected: field.isInjected,
        injectionType: field.injectionType,
      }))
    ).sort((a, b) => `${a.owner}|${a.name}`.localeCompare(`${b.owner}|${b.name}`)));
  }

  private static hashAnnotations(ast: FullASTOutput): string {
    const annotations: any[] = [];
    for (const cls of ast.classes || []) {
      annotations.push({ target: cls.fullyQualifiedName, values: ImpactAnalyzer.annotationNames(cls.annotations) });
      for (const field of cls.attributes || []) {
        annotations.push({ target: `${cls.fullyQualifiedName}.${field.name}`, values: ImpactAnalyzer.annotationNames(field.annotations) });
      }
      for (const method of cls.methods || []) {
        annotations.push({ target: `${cls.fullyQualifiedName}.${method.name}()`, values: ImpactAnalyzer.annotationNames(method.annotations) });
        for (const param of method.parameters || []) {
          annotations.push({ target: `${cls.fullyQualifiedName}.${method.name}(${param.position})`, values: ImpactAnalyzer.annotationNames(param.annotations) });
        }
      }
    }
    return ImpactAnalyzer.stableStringify(annotations.sort((a, b) => a.target.localeCompare(b.target)));
  }

  private static hashMethodCalls(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.classes || []).flatMap(cls =>
      (cls.methods || []).flatMap(method =>
        (method.calledMethods || []).map(call => ({
          owner: cls.fullyQualifiedName,
          method: method.name,
          called: call.calledMethodName,
          targetClass: call.targetClass,
          targetMethod: call.targetMethod,
          receiver: call.receiverVariableName,
          receiverType: call.receiverType,
          library: call.isLibraryCall,
          args: call.arguments || [],
        }))
      )
    ).sort((a, b) => `${a.owner}|${a.method}|${a.called}|${a.targetClass || ''}`.localeCompare(`${b.owner}|${b.method}|${b.called}|${b.targetClass || ''}`)));
  }

  private static hashObjectCreations(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.classes || []).flatMap(cls =>
      (cls.methods || []).flatMap(method =>
        (method.createdObjects || []).map(creation => ({
          owner: cls.fullyQualifiedName,
          method: method.name,
          type: creation.className,
          args: creation.constructorArgs || [],
          loop: creation.insideLoop,
          branching: creation.hasBranching,
        }))
      )
    ).sort((a, b) => `${a.owner}|${a.method}|${a.type}`.localeCompare(`${b.owner}|${b.method}|${b.type}`)));
  }

  private static hashMethodComplexity(ast: FullASTOutput): string {
    return ImpactAnalyzer.stableStringify((ast.classes || []).flatMap(cls =>
      (cls.methods || []).map(method => ({
        owner: cls.fullyQualifiedName,
        method: method.name,
        complexity: method.complexityMetrics?.cyclomaticComplexity,
        nesting: method.complexityMetrics?.maxNestingDepth,
        decisions: (method.complexityMetrics?.decisionPoints || []).map(point => ({
          type: point.type,
          condition: point.condition,
          depth: point.nestingDepth,
        })),
        bodyScore: method.body?.businessLogicScore,
        writes: method.body?.persistenceWrites || [],
        writtenVariables: method.body?.writtenVariables || [],
      }))
    ).sort((a, b) => `${a.owner}|${a.method}`.localeCompare(`${b.owner}|${b.method}`)));
  }

  private static annotationNames(annotations: any[] | undefined): string[] {
    return (annotations || [])
      .map(annotation => `${annotation.fullyQualifiedName || annotation.name}:${ImpactAnalyzer.stableStringify(annotation.elements || {})}`)
      .sort();
  }

  private static stableStringify(value: unknown): string {
    return JSON.stringify(ImpactAnalyzer.sortObjectKeys(value));
  }

  private static sortObjectKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(item => ImpactAnalyzer.sortObjectKeys(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = ImpactAnalyzer.sortObjectKeys((value as Record<string, unknown>)[key]);
        return sorted;
      }, {});
  }
}
