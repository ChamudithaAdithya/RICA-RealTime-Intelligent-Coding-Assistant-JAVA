import { FullASTOutput, ClassInfo, Method } from './domain/astTypes';
import { Violation, DiagnosticRange } from './domain/violations';
import { ProjectDependencyGraph } from './dependencyGraph';
import { AnalyzerConfig, DEFAULT_LAYER_BOUNDARIES } from './domain/analyzerConfig';

const DP_RULE_CODES: Record<string, string> = {
  'missing-adapter': 'RICA-V301',
  'god-facade': 'RICA-V302',
  'missing-strategy': 'RICA-V303',
  'missing-factory': 'RICA-V304',
  'mutable-singleton': 'RICA-V305',
  'raw-thread': 'RICA-V306',
  'missing-abstraction': 'RICA-V307',
};

const DP_MITIGATIONS: Record<string, string> = {
  'missing-adapter': 'Wrap the external dependency behind a Port interface in application/port/out/ and create an Adapter implementation in infrastructure/adapter/',
  'god-facade': 'Decompose this facade — extract domain logic into domain objects and keep only orchestration here',
  'missing-strategy': 'Replace the conditional chain with a Strategy pattern — each branch should be a separate class implementing a common interface',
  'missing-factory': 'Extract object creation behind a Factory — callers should depend on the interface, not the concrete class',
  'mutable-singleton': 'Replace static mutable state with DI-scoped beans (@Bean, @Scope) or immutable configuration',
  'raw-thread': 'Use @Async or a TaskExecutor bean instead of managing threads directly — this gives lifecycle management and monitoring',
  'missing-abstraction': 'Either this abstraction is unnecessary (YAGNI — consider inlining), or add more implementations to justify the indirection',
};

export class DesignPatternAnalyzer {
  private config: AnalyzerConfig;

  constructor(config?: Partial<AnalyzerConfig>) {
    this.config = {
      enableArchitecturalChecks: true,
      enableDesignPatternChecks: true,
      enableBusinessLogicChecks: true,
      businessLogicThreshold: 3,
      excludePatterns: [],
      layerBoundaries: { ...DEFAULT_LAYER_BOUNDARIES },
      ...config,
    };
  }

  analyze(asts: FullASTOutput[], graph?: ProjectDependencyGraph, classLookup?: Record<string, FullASTOutput>): Violation[] {
    if (!this.config.enableDesignPatternChecks) return [];

    const violations: Violation[] = [];
    const allAsts = classLookup ? Object.values(classLookup) : asts;

    violations.push(...this.checkRawThread(asts));
    violations.push(...this.checkMutableSingleton(asts));
    violations.push(...this.checkMissingAbstraction(asts, graph));
    violations.push(...this.checkMissingAdapter(asts, allAsts));
    violations.push(...this.checkMissingFactory(asts, allAsts));
    violations.push(...this.checkGodFacade(asts, graph));
    violations.push(...this.checkMissingStrategy(asts));

    return violations;
  }

  private toViolation(
    ruleType: string,
    message: string,
    filePath: string,
    lineNumber?: number,
    range?: DiagnosticRange,
    methodName?: string,
    fieldName?: string,
    targetType?: string,
  ): Violation {
    return {
      id: `DP-${ruleType}-${filePath}-${methodName || ''}-${fieldName || ''}-${lineNumber || 0}`,
      code: DP_RULE_CODES[ruleType] || 'RICA-V300',
      ruleName: `DesignPattern: ${ruleType.replace(/-/g, ' ')}`,
      severity: ruleType === 'raw-thread' || ruleType === 'missing-adapter' || ruleType === 'missing-factory' ? 'error' : 'warning',
      message,
      filePath,
      lineNumber,
      range,
      mitigationHint: DP_MITIGATIONS[ruleType] || 'Review the design pattern guidelines for this violation',
      detectorSource: 'DesignPatternAnalyzer',
      contextMetadata: { methodName, fieldName, targetComponent: targetType },
      legacyType: ruleType,
    };
  }

  // ─── V306 Raw Thread ─────────────────────────────────────────────

  private readonly THREAD_TYPES = new Set([
    'Thread', 'Runnable', 'Callable', 'Future', 'FutureTask',
    'ExecutorService', 'Executor', 'Executors', 'ThreadPoolExecutor',
    'ScheduledExecutorService', 'ScheduledThreadPoolExecutor',
    'CompletableFuture', 'CompletionService', 'ExecutorCompletionService',
    'Timer', 'TimerTask', 'TaskScheduler', 'ThreadFactory',
  ]);

  private checkRawThread(asts: FullASTOutput[]): Violation[] {
    const violations: Violation[] = [];
    for (const ast of asts) {
      const isConfigClass = ast.classes.some(c =>
        c.annotations?.some(a => a.name === 'Configuration')
      );
      if (isConfigClass) continue;

      for (const cls of ast.classes) {
        for (const method of cls.methods) {
          for (const creation of method.createdObjects) {
            if (this.THREAD_TYPES.has(creation.className)) {
              violations.push(this.toViolation(
                'raw-thread',
                `Method '${method.name}' creates a raw '${creation.className}'. Use @Async or a TaskExecutor instead.`,
                ast.filePath || '', creation.lineNumber, undefined, method.name, undefined, creation.className,
              ));
            }
          }
          for (const call of method.calledMethods) {
            const simple = call.targetClass?.split('.').pop() || '';
            if (call.calledMethodName === 'execute' && simple === 'Executors') {
              violations.push(this.toViolation(
                'raw-thread',
                `Method '${method.name}' calls Executors.execute() directly. Use @Async or a TaskExecutor instead.`,
                ast.filePath || '', call.lineNumber, undefined, method.name,
              ));
            }
          }
        }
      }
    }
    return violations;
  }

  // ─── V305 Mutable Singleton ──────────────────────────────────────

  private readonly MUTABLE_TYPES = new Set([
    'HashMap', 'ConcurrentHashMap', 'LinkedHashMap', 'TreeMap',
    'ArrayList', 'LinkedList', 'Vector', 'Stack',
    'HashSet', 'LinkedHashSet', 'TreeSet',
    'StringBuilder', 'StringBuffer',
  ]);

  private readonly MUTABLE_INTERFACE_TYPES = new Set(['Map', 'List', 'Set', 'Collection']);

  private checkMutableSingleton(asts: FullASTOutput[]): Violation[] {
    const violations: Violation[] = [];
    for (const ast of asts) {
      for (const cls of ast.classes) {
        for (const field of cls.attributes) {
          if (!field.isStatic || field.isFinal) continue;
          const rawType = field.dataType.replace(/<.*>/g, '').trim();
          if (this.MUTABLE_TYPES.has(rawType) || this.MUTABLE_INTERFACE_TYPES.has(rawType)) {
            violations.push(this.toViolation(
              'mutable-singleton',
              `Field '${field.name}' is a static mutable '${rawType}'. Replace with DI-scoped beans or immutable config.`,
              ast.filePath || '', field.startLine, undefined, undefined, field.name, rawType,
            ));
          }
        }
      }
    }
    return violations;
  }

  // ─── V307 Missing Abstraction ────────────────────────────────────

  private checkMissingAbstraction(asts: FullASTOutput[], _graph?: ProjectDependencyGraph): Violation[] {
    const violations: Violation[] = [];

    const implMap = this.buildImplementationMap(asts);
    const implCounts = new Map<string, number>();

    for (const [impl, abs] of implMap) {
      implCounts.set(abs, (implCounts.get(abs) || 0) + 1);
    }

    for (const [fqcn, cls] of this.classIndex(asts)) {
      if (cls.classType !== 'interface' && !cls.isAbstract) continue;
      const count = implCounts.get(fqcn) || 0;
      if (count !== 1) continue;
      const clsAst = asts.find(a => a.classes.some(c => (c.fullyQualifiedName || c.className) === fqcn));
      if (!clsAst) continue;
      violations.push(this.toViolation(
        'missing-abstraction',
        `${cls.classType === 'interface' ? 'Interface' : 'Abstract class'} '${cls.className}' has only 1 implementation. Either add more or inline it (YAGNI).`,
        clsAst.filePath || '', cls.startLine, undefined, undefined, undefined, fqcn,
      ));
    }
    return violations;
  }

  private buildImplementationMap(asts: FullASTOutput[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const ast of asts) {
      for (const cls of ast.classes) {
        const fqcn = cls.fullyQualifiedName || cls.className;
        if (cls.interfaces) {
          for (const iface of cls.interfaces) {
            map.set(fqcn, iface);
          }
        }
        if (cls.superClass && cls.superClass !== 'Object' && cls.superClass !== 'Enum' && cls.superClass !== 'Record') {
          const superCls = this.findClass(cls.superClass, asts);
          if (superCls?.isAbstract) {
            map.set(fqcn, cls.superClass);
          }
        }
      }
    }
    return map;
  }

  private classIndex(asts: FullASTOutput[]): Map<string, ClassInfo> {
    const map = new Map<string, ClassInfo>();
    for (const ast of asts) {
      for (const cls of ast.classes) {
        map.set(cls.fullyQualifiedName || cls.className, cls);
      }
    }
    return map;
  }

  private findClass(simpleOrFqcn: string, asts: FullASTOutput[]): ClassInfo | undefined {
    for (const ast of asts) {
      for (const cls of ast.classes) {
        if ((cls.fullyQualifiedName || cls.className) === simpleOrFqcn) return cls;
        if (cls.className === simpleOrFqcn) return cls;
      }
    }
    return undefined;
  }

  // ─── V301 Adapter Missing ────────────────────────────────────────

  private readonly EXTERNAL_SDK_PREFIXES = [
    'org.apache.http', 'org.apache.hc',
    'io.netty',
    'com.squareup.okhttp', 'com.squareup.retrofit2',
    'redis.clients', 'io.lettuce',
    'com.rabbitmq', 'org.apache.kafka',
    'software.amazon.awssdk', 'com.amazonaws',
    'com.google.cloud',
    'org.elasticsearch', 'co.elastic.clients',
    'org.mongodb', 'org.neo4j',
  ];

  private checkMissingAdapter(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {
    const violations: Violation[] = [];
    for (const ast of asts) {
      const fileLayer = this.matchLayer(ast.filePath || '');
      if (fileLayer !== 'domain' && fileLayer !== 'application') continue;

      for (const imp of ast.imports || []) {
        const matchedPkg = this.EXTERNAL_SDK_PREFIXES.find(p => imp.qualifiedName.startsWith(p));
        if (!matchedPkg) continue;

        // Check if a corresponding adapter exists in infrastructure
        if (!this.hasAdapterFor(imp.qualifiedName, allAsts)) {
          violations.push(this.toViolation(
            'missing-adapter',
            `Service '${this.getClassName(ast)}' directly imports external SDK '${imp.qualifiedName}'. Wrap it behind a Port interface.`,
            ast.filePath || '', imp.line, undefined, undefined, undefined, imp.qualifiedName,
          ));
        }
      }
    }
    return violations;
  }

  private hasAdapterFor(sdkFqcn: string, allAsts: FullASTOutput[]): boolean {
    const sdkSimple = sdkFqcn.split('.').pop() || '';
    const infraLayer = this.config.layerBoundaries?.infrastructure?.packages || [];
    for (const ast of allAsts) {
      const path = (ast.filePath || '').replace(/\\/g, '/');
      const inInfrastructure = infraLayer.some(p => this.simpleGlobMatch(path, p));
      if (!inInfrastructure) continue;
      for (const cls of ast.classes) {
        if (cls.interfaces.length > 0) return true;
        if (cls.className.toLowerCase().includes(sdkSimple.toLowerCase())) return true;
        if (cls.className.endsWith('Adapter') || cls.className.endsWith('Client')) return true;
      }
    }
    return false;
  }

  // ─── V304 Factory Missing ────────────────────────────────────────

  private checkMissingFactory(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {
    const violations: Violation[] = [];

    // Phase 1: count instantiations per concrete type
    const instantiationCounts = new Map<string, { callers: Set<string>; sites: { ast: FullASTOutput; method: Method; creation: any }[] }>();
    for (const ast of asts) {
      for (const cls of ast.classes) {
        for (const method of cls.methods) {
          for (const creation of method.createdObjects) {
            const target = creation.className;
            if (!target || target.includes('Builder')) continue; // skip Lombok builders
            const callerFqcn = cls.fullyQualifiedName || cls.className;
            if (!instantiationCounts.has(target)) {
              instantiationCounts.set(target, { callers: new Set(), sites: [] });
            }
            instantiationCounts.get(target)!.callers.add(callerFqcn);
            instantiationCounts.get(target)!.sites.push({ ast, method, creation });
          }
        }
      }
    }

    // Phase 2: flag concretes with >=3 distinct callers that have interfaces
    for (const [concrete, info] of instantiationCounts) {
      if (info.callers.size < 3) continue;
      const concreteCls = this.resolveClass(concrete, allAsts);
      if (!concreteCls) continue;
      const hasAbstraction = concreteCls.interfaces.length > 0
        || (concreteCls.superClass !== 'Object' && concreteCls.superClass !== 'Enum' && concreteCls.superClass !== 'Record');
      if (!hasAbstraction) continue;

      // Report on the first site only (to avoid flooding)
      const site = info.sites[0];
      violations.push(this.toViolation(
        'missing-factory',
        `'${concrete}' is instantiated via new from ${info.callers.size} different callers but implements/extend an abstraction. Extract a Factory.`,
        site.ast.filePath || '', site.creation.lineNumber, undefined, site.method.name, undefined, concrete,
      ));
    }
    return violations;
  }

  private resolveClass(simpleOrFqcn: string, allAsts: FullASTOutput[]): ClassInfo | undefined {
    for (const ast of allAsts) {
      for (const cls of ast.classes) {
        if (cls.className === simpleOrFqcn) return cls;
        if ((cls.fullyQualifiedName || cls.className) === simpleOrFqcn) return cls;
      }
    }
    return undefined;
  }

  // ─── V302 God Facade ─────────────────────────────────────────────

  private checkGodFacade(asts: FullASTOutput[], graph?: ProjectDependencyGraph): Violation[] {
    const violations: Violation[] = [];
    if (!graph) return violations;

    for (const ast of asts) {
      for (const cls of ast.classes) {
        const fqcn = cls.fullyQualifiedName || cls.className;
        const inDegree = graph.getIncomingEdges(fqcn).length;
        if (inDegree < 8) continue;

        const bodyStart = cls.startLine || 0;
        const bodyEnd = cls.endLine || 0;
        const loc = bodyEnd - bodyStart;
        if (loc < 500) continue;

        let delegateCount = 0;
        for (const method of cls.methods) {
          if (method.calledMethods.length === 1 && method.createdObjects.length === 0) {
            const methodLoc = (method.endLine || method.startLine || 0) - (method.startLine || 0);
            if (methodLoc < 10) delegateCount++;
          }
        }
        const delegateRatio = cls.methods.length > 0 ? delegateCount / cls.methods.length : 0;
        if (delegateRatio <= 0.6) continue;

        violations.push(this.toViolation(
          'god-facade',
          `'${cls.className}' has ${inDegree} incoming deps, ${loc} LOC, and ${Math.round(delegateRatio * 100)}% delegation methods. Extract domain logic into domain objects.`,
          ast.filePath || '', cls.startLine, undefined, undefined, undefined, fqcn,
        ));
      }
    }
    return violations;
  }

  // ─── V303 Strategy Missing ───────────────────────────────────────

  private checkMissingStrategy(asts: FullASTOutput[]): Violation[] {
    const violations: Violation[] = [];
    for (const ast of asts) {
      for (const cls of ast.classes) {
        const layer = cls.detectedLayer;
        if (layer !== 'service') continue; // only flag in service classes

        for (const method of cls.methods) {
          const dps = method.complexityMetrics?.decisionPoints || [];

          // Check if-else chain — extract variable name from conditions like "type == X"
          const ifPoints = dps.filter(d => d.type === 'if' || d.type === 'else-if');
          if (ifPoints.length >= 4) {
            const varNames = ifPoints
              .map(d => d.condition ? d.condition.split(/==|!=|<=?|>=?|\s+/)[0].trim() : '')
              .filter(Boolean);
            const uniqueVarNames = new Set(varNames);
            if (uniqueVarNames.size <= 2) {
              violations.push(this.toViolation(
                'missing-strategy',
                `Method '${method.name}' has ${ifPoints.length} if-else branches evaluating the same variable. Replace with Strategy pattern.`,
                ast.filePath || '', method.startLine, undefined, method.name, undefined,
              ));
              continue;
            }
          }

          // Check switch-case
          const switchPoints = dps.filter(d => d.type === 'switch');
          for (const sp of switchPoints) {
            const caseCount = dps.filter(d => d.type === 'case' && d.nestingDepth === sp.nestingDepth).length;
            if (caseCount >= 4) {
              violations.push(this.toViolation(
                'missing-strategy',
                `Method '${method.name}' has a switch with ${caseCount} cases. Replace with Strategy/State pattern.`,
                ast.filePath || '', method.startLine, undefined, method.name, undefined,
              ));
            }
          }
        }
      }
    }
    return violations;
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private matchLayer(filePath: string): string | null {
    const boundaries = this.config.layerBoundaries;
    if (!boundaries) return null;
    const normalized = filePath.replace(/\\/g, '/');
    for (const [name, boundary] of Object.entries(boundaries)) {
      for (const pattern of boundary.packages) {
        if (this.simpleGlobMatch(normalized, pattern)) return name;
      }
    }
    return null;
  }

  private simpleGlobMatch(path: string, pattern: string): boolean {
    const regexStr = '^' + pattern
      .replace(/\*\*/g, '___DS___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DS___/g, '.*')
      .replace(/\?/g, '.') + '$';
    try {
      return new RegExp(regexStr).test(path);
    } catch {
      return path.includes(pattern.replace(/\*\*/g, '').replace(/\*/g, ''));
    }
  }

  private getClassName(ast: FullASTOutput): string {
    return ast.classes[0]?.className || ast.filePath?.split('/').pop()?.replace('.java', '') || 'Unknown';
  }
}
