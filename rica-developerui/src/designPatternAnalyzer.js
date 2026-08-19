"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignPatternAnalyzer = void 0;
const analyzerConfig_1 = require("./domain/analyzerConfig");
const DP_RULE_CODES = {
    'missing-adapter': 'RICA-V301',
    'god-facade': 'RICA-V302',
    'missing-strategy': 'RICA-V303',
    'missing-factory': 'RICA-V304',
    'mutable-singleton': 'RICA-V305',
    'raw-thread': 'RICA-V306',
    'missing-abstraction': 'RICA-V307',
    'leaking-construction': 'RICA-V308',
    'fat-interface': 'RICA-V309',
    'missing-command': 'RICA-V310',
    'missing-prototype': 'RICA-V311',
    'fragmented-factories': 'RICA-V312',
    'missing-decorator': 'RICA-V313',
    'missing-composite': 'RICA-V314',
    'redundant-memory': 'RICA-V315',
    'scattered-state-machine': 'RICA-V316',
    'duplicate-algorithm': 'RICA-V317',
    'hardcoded-notifier': 'RICA-V318',
    'monolithic-pipeline': 'RICA-V319',
    'service-locator': 'RICA-V320',
    'excessive-null-checks': 'RICA-V321',
};
const DP_MITIGATIONS = {
    'missing-adapter': 'Wrap the external dependency behind a Port interface in application/port/out/ and create an Adapter implementation in infrastructure/adapter/',
    'god-facade': 'Decompose this facade — extract domain logic into domain objects and keep only orchestration here',
    'missing-strategy': 'Replace the conditional chain with a Strategy pattern — each branch should be a separate class implementing a common interface',
    'missing-factory': 'Extract object creation behind a Factory — callers should depend on the interface, not the concrete class',
    'mutable-singleton': 'Replace static mutable state with DI-scoped beans (@Bean, @Scope) or immutable configuration',
    'raw-thread': 'Use @Async or a TaskExecutor bean instead of managing threads directly — this gives lifecycle management and monitoring',
    'missing-abstraction': 'Either this abstraction is unnecessary (YAGNI — consider inlining), or add more implementations to justify the indirection',
    'leaking-construction': 'Extract complex object initialization into a Builder or Factory so business methods stay focused on orchestration',
    'fat-interface': 'Split this interface by responsibility (ISP) — clients should depend only on the methods they actually use',
    'missing-command': 'Encapsulate each multi-step write sequence as a Command object (or @Transactional boundary) to keep transactions explicit',
    'missing-prototype': 'Copy objects via clone()/copy constructors (Prototype) instead of manual field-by-field getter→setter copying',
    'fragmented-factories': 'Introduce an Abstract Factory interface so related product families are created through a unified hierarchy',
    'missing-decorator': 'Extract cross-cutting concerns (logging, metrics, tracing, audit) into dedicated decorators or AOP advisors',
    'missing-composite': 'Expose a uniform Component interface so leaves and containers are treated identically — drop instanceof/loop branching',
    'redundant-memory': 'Reuse immutable value objects (Flyweight/cache) instead of allocating them inside loops or stream pipelines',
    'scattered-state-machine': 'Encapsulate status/state transitions in State objects instead of scattering hardcoded enum comparisons',
    'duplicate-algorithm': 'Extract the common skeleton into a Template Method and vary only the differing sub-steps per class',
    'hardcoded-notifier': 'Decouple notification/audit side-effects via an Observer/event bus instead of direct multi-service calls',
    'monolithic-pipeline': 'Decompose the linear guard/validation chain into configurable Chain-of-Responsibility handlers',
    'service-locator': 'Inject dependencies constructor/field-style instead of looking them up via ApplicationContext/ServiceLocator',
    'excessive-null-checks': 'Replace repetitive null checks with Optional, Null Objects, or empty collections at the source',
};
class DesignPatternAnalyzer {
    constructor(config) {
        // ─── V306 Raw Thread ─────────────────────────────────────────────
        this.THREAD_TYPES = new Set([
            'Thread', 'Runnable', 'Callable', 'Future', 'FutureTask',
            'ExecutorService', 'Executor', 'Executors', 'ThreadPoolExecutor',
            'ScheduledExecutorService', 'ScheduledThreadPoolExecutor',
            'CompletableFuture', 'CompletionService', 'ExecutorCompletionService',
            'Timer', 'TimerTask', 'TaskScheduler', 'ThreadFactory',
        ]);
        // ─── V305 Mutable Singleton ──────────────────────────────────────
        this.MUTABLE_TYPES = new Set([
            'HashMap', 'ConcurrentHashMap', 'LinkedHashMap', 'TreeMap',
            'ArrayList', 'LinkedList', 'Vector', 'Stack',
            'HashSet', 'LinkedHashSet', 'TreeSet',
            'StringBuilder', 'StringBuffer',
        ]);
        this.MUTABLE_INTERFACE_TYPES = new Set(['Map', 'List', 'Set', 'Collection']);
        // ─── V301 Adapter Missing ────────────────────────────────────────
        this.EXTERNAL_SDK_PREFIXES = [
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
        // ─── V308 Leaking Construction Logic ─────────────────────────────
        this.BUILDER_PATTERN_RE = /builder|\.with[A-Z]/i;
        // ─── V309 Fat Interface (ISP) ────────────────────────────────────
        this.INTERFACE_USAGE_RATIO_THRESHOLD = 0.5;
        // ─── V310 Missing Command Pattern ────────────────────────────────
        this.COMMAND_WRITE_COUNT_THRESHOLD = 2;
        // ─── V311 Missing Prototype (deep-copy smell) ────────────────────
        this.COPY_PAIR_THRESHOLD = 3;
        // ─── V313 Missing Decorator (cross-cutting interleaving) ─────────
        this.CROSS_CUTTING_CALL_RE = /^(info|debug|warn|error|trace|log|increment|counter|startSpan|span|endSpan|audit|record|observe|time)$/i;
        this.CROSS_CUTTING_TYPE_RE = /(Logger|Log|Metrics|Meter|MeterRegistry|Tracer|Audit|AuditLog|RateLimiter|TracerProvider)$/i;
        // ─── V316 Scattered State Machine ────────────────────────────────
        this.STATE_CONDITION_RE = /(get(Status|State)\(\)|\.(STATUS|STATE)\.)\s*(==|!=)|(PENDING|ACTIVE|COMPLETED|DISABLED|SUCCESS|FAILED)\s*==/i;
        // ─── V318 Hardcoded Multi-Notifier ───────────────────────────────
        this.NOTIFIER_TYPE_RE = /(Notifier|Notification|EmailService|SmsService|Sms|PushService|PushClient|PushNotification|Push|MailSender|AuditLogService|AuditService|AuditLog|LogService|EventPublisher|EventBus)$/i;
        this.NOTIFIER_METHOD_RE = /^(send|notify|notifyAll|publish|email|sms|push|audit|record|dispatch|fire)$/i;
        // ─── V320 Service Locator Anti-Pattern ───────────────────────────
        this.SERVICE_LOCATOR_TYPE_RE = /(ApplicationContext|ConfigurableApplicationContext|ServiceLocator|Locator|Registry|BeanFactory|ApplicationContextAware)$/i;
        this.SERVICE_LOCATOR_METHOD_RE = /^(getBean|getInstance|getService|getImplementation|lookup|locate|resolve|getApplicationContext|requireService)$/i;
        this.config = {
            enableArchitecturalChecks: true,
            enableDesignPatternChecks: true,
            enableBusinessLogicChecks: true,
            businessLogicThreshold: 3,
            constructionStatementLimit: 5,
            fatInterfaceMethodLimit: 10,
            missingCommandComplexityThreshold: 6,
            crossCuttingCallLimit: 2,
            stateMachineClassLimit: 3,
            notifierTargetLimit: 3,
            guardClauseLimit: 5,
            nullCheckLimit: 3,
            templateMethodSimilarity: 0.8,
            excludePatterns: [],
            layerBoundaries: { ...analyzerConfig_1.DEFAULT_LAYER_BOUNDARIES },
            ...config,
        };
    }
    analyze(asts, graph, classLookup) {
        if (!this.config.enableDesignPatternChecks)
            return [];
        const violations = [];
        const allAsts = classLookup ? Object.values(classLookup) : asts;
        violations.push(...this.checkRawThread(asts));
        violations.push(...this.checkMutableSingleton(asts));
        violations.push(...this.checkMissingAbstraction(asts, graph));
        violations.push(...this.checkMissingAdapter(asts, allAsts));
        violations.push(...this.checkMissingFactory(asts, allAsts));
        violations.push(...this.checkGodFacade(asts, graph));
        violations.push(...this.checkMissingStrategy(asts));
        violations.push(...this.checkLeakingConstruction(asts));
        violations.push(...this.checkFatInterface(asts, allAsts));
        violations.push(...this.checkMissingCommand(asts));
        violations.push(...this.checkMissingPrototype(asts));
        violations.push(...this.checkFragmentedFactories(asts, allAsts));
        violations.push(...this.checkMissingDecorator(asts));
        violations.push(...this.checkMissingComposite(asts));
        violations.push(...this.checkRedundantMemory(asts));
        violations.push(...this.checkScatteredStateMachine(asts, allAsts));
        violations.push(...this.checkDuplicateAlgorithm(asts, allAsts));
        violations.push(...this.checkHardcodedNotifier(asts));
        violations.push(...this.checkMonolithicPipeline(asts));
        violations.push(...this.checkServiceLocator(asts));
        violations.push(...this.checkExcessiveNullChecks(asts));
        return violations;
    }
    toViolation(ruleType, message, filePath, lineNumber, range, methodName, fieldName, targetType) {
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
    checkRawThread(asts) {
        const violations = [];
        for (const ast of asts) {
            const isConfigClass = ast.classes.some(c => c.annotations?.some(a => a.name === 'Configuration'));
            if (isConfigClass)
                continue;
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    for (const creation of method.createdObjects) {
                        if (this.THREAD_TYPES.has(creation.className)) {
                            violations.push(this.toViolation('raw-thread', `Method '${method.name}' creates a raw '${creation.className}'. Use @Async or a TaskExecutor instead.`, ast.filePath || '', creation.lineNumber, undefined, method.name, undefined, creation.className));
                        }
                    }
                    for (const call of method.calledMethods) {
                        const simple = call.targetClass?.split('.').pop() || '';
                        if (call.calledMethodName === 'execute' && simple === 'Executors') {
                            violations.push(this.toViolation('raw-thread', `Method '${method.name}' calls Executors.execute() directly. Use @Async or a TaskExecutor instead.`, ast.filePath || '', call.lineNumber, undefined, method.name));
                        }
                    }
                }
            }
        }
        return violations;
    }
    checkMutableSingleton(asts) {
        const violations = [];
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const field of cls.attributes) {
                    if (!field.isStatic || field.isFinal)
                        continue;
                    const rawType = field.dataType.replace(/<.*>/g, '').trim();
                    if (this.MUTABLE_TYPES.has(rawType) || this.MUTABLE_INTERFACE_TYPES.has(rawType)) {
                        violations.push(this.toViolation('mutable-singleton', `Field '${field.name}' is a static mutable '${rawType}'. Replace with DI-scoped beans or immutable config.`, ast.filePath || '', field.startLine, undefined, undefined, field.name, rawType));
                    }
                }
            }
        }
        return violations;
    }
    // ─── V307 Missing Abstraction ────────────────────────────────────
    checkMissingAbstraction(asts, _graph) {
        const violations = [];
        const implMap = this.buildImplementationMap(asts);
        const implCounts = new Map();
        for (const [impl, abs] of implMap) {
            implCounts.set(abs, (implCounts.get(abs) || 0) + 1);
        }
        for (const [fqcn, cls] of this.classIndex(asts)) {
            if (cls.classType !== 'interface' && !cls.isAbstract)
                continue;
            const count = implCounts.get(fqcn) || 0;
            if (count !== 1)
                continue;
            const clsAst = asts.find(a => a.classes.some(c => (c.fullyQualifiedName || c.className) === fqcn));
            if (!clsAst)
                continue;
            violations.push(this.toViolation('missing-abstraction', `${cls.classType === 'interface' ? 'Interface' : 'Abstract class'} '${cls.className}' has only 1 implementation. Either add more or inline it (YAGNI).`, clsAst.filePath || '', cls.startLine, undefined, undefined, undefined, fqcn));
        }
        return violations;
    }
    buildImplementationMap(asts) {
        const map = new Map();
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
    classIndex(asts) {
        const map = new Map();
        for (const ast of asts) {
            for (const cls of ast.classes) {
                map.set(cls.fullyQualifiedName || cls.className, cls);
            }
        }
        return map;
    }
    findClass(simpleOrFqcn, asts) {
        for (const ast of asts) {
            for (const cls of ast.classes) {
                if ((cls.fullyQualifiedName || cls.className) === simpleOrFqcn)
                    return cls;
                if (cls.className === simpleOrFqcn)
                    return cls;
            }
        }
        return undefined;
    }
    checkMissingAdapter(asts, allAsts) {
        const violations = [];
        for (const ast of asts) {
            const fileLayer = this.matchLayer(ast.filePath || '');
            if (fileLayer !== 'domain' && fileLayer !== 'application')
                continue;
            for (const imp of ast.imports || []) {
                const matchedPkg = this.EXTERNAL_SDK_PREFIXES.find(p => imp.qualifiedName.startsWith(p));
                if (!matchedPkg)
                    continue;
                // Check if a corresponding adapter exists in infrastructure
                if (!this.hasAdapterFor(imp.qualifiedName, allAsts)) {
                    violations.push(this.toViolation('missing-adapter', `Service '${this.getClassName(ast)}' directly imports external SDK '${imp.qualifiedName}'. Wrap it behind a Port interface.`, ast.filePath || '', imp.line, undefined, undefined, undefined, imp.qualifiedName));
                }
            }
        }
        return violations;
    }
    hasAdapterFor(sdkFqcn, allAsts) {
        const sdkSimple = sdkFqcn.split('.').pop() || '';
        const infraLayer = this.config.layerBoundaries?.infrastructure?.packages || [];
        for (const ast of allAsts) {
            const path = (ast.filePath || '').replace(/\\/g, '/');
            const inInfrastructure = infraLayer.some(p => this.simpleGlobMatch(path, p));
            if (!inInfrastructure)
                continue;
            for (const cls of ast.classes) {
                if (cls.interfaces.length > 0)
                    return true;
                if (cls.className.toLowerCase().includes(sdkSimple.toLowerCase()))
                    return true;
                if (cls.className.endsWith('Adapter') || cls.className.endsWith('Client'))
                    return true;
            }
        }
        return false;
    }
    // ─── V304 Factory Missing ────────────────────────────────────────
    checkMissingFactory(asts, allAsts) {
        const violations = [];
        // Phase 1: count instantiations per concrete type
        const instantiationCounts = new Map();
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    for (const creation of method.createdObjects) {
                        const target = creation.className;
                        if (!target || target.includes('Builder'))
                            continue; // skip Lombok builders
                        const callerFqcn = cls.fullyQualifiedName || cls.className;
                        if (!instantiationCounts.has(target)) {
                            instantiationCounts.set(target, { callers: new Set(), sites: [] });
                        }
                        instantiationCounts.get(target).callers.add(callerFqcn);
                        instantiationCounts.get(target).sites.push({ ast, method, creation });
                    }
                }
            }
        }
        // Phase 2: flag concretes with >=3 distinct callers that have interfaces
        for (const [concrete, info] of instantiationCounts) {
            if (info.callers.size < 3)
                continue;
            const concreteCls = this.resolveClass(concrete, allAsts);
            if (!concreteCls)
                continue;
            const hasAbstraction = concreteCls.interfaces.length > 0
                || (concreteCls.superClass !== 'Object' && concreteCls.superClass !== 'Enum' && concreteCls.superClass !== 'Record');
            if (!hasAbstraction)
                continue;
            // Report on the first site only (to avoid flooding)
            const site = info.sites[0];
            violations.push(this.toViolation('missing-factory', `'${concrete}' is instantiated via new from ${info.callers.size} different callers but implements/extend an abstraction. Extract a Factory.`, site.ast.filePath || '', site.creation.lineNumber, undefined, site.method.name, undefined, concrete));
        }
        return violations;
    }
    resolveClass(simpleOrFqcn, allAsts) {
        for (const ast of allAsts) {
            for (const cls of ast.classes) {
                if (cls.className === simpleOrFqcn)
                    return cls;
                if ((cls.fullyQualifiedName || cls.className) === simpleOrFqcn)
                    return cls;
            }
        }
        return undefined;
    }
    // ─── V302 God Facade ─────────────────────────────────────────────
    checkGodFacade(asts, graph) {
        const violations = [];
        if (!graph)
            return violations;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                const fqcn = cls.fullyQualifiedName || cls.className;
                const inDegree = graph.getFanIn(fqcn);
                if (inDegree < 8)
                    continue;
                const bodyStart = cls.startLine || 0;
                const bodyEnd = cls.endLine || 0;
                const loc = bodyEnd - bodyStart;
                if (loc < 500)
                    continue;
                let delegateCount = 0;
                for (const method of cls.methods) {
                    if (method.calledMethods.length === 1 && method.createdObjects.length === 0) {
                        const methodLoc = (method.endLine || method.startLine || 0) - (method.startLine || 0);
                        if (methodLoc < 10)
                            delegateCount++;
                    }
                }
                const delegateRatio = cls.methods.length > 0 ? delegateCount / cls.methods.length : 0;
                if (delegateRatio <= 0.6)
                    continue;
                violations.push(this.toViolation('god-facade', `'${cls.className}' has ${inDegree} incoming deps, ${loc} LOC, and ${Math.round(delegateRatio * 100)}% delegation methods. Extract domain logic into domain objects.`, ast.filePath || '', cls.startLine, undefined, undefined, undefined, fqcn));
            }
        }
        return violations;
    }
    // ─── V303 Strategy Missing ───────────────────────────────────────
    checkMissingStrategy(asts) {
        const violations = [];
        for (const ast of asts) {
            for (const cls of ast.classes) {
                const layer = cls.detectedLayer;
                if (layer !== 'service')
                    continue; // only flag in service classes
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
                            violations.push(this.toViolation('missing-strategy', `Method '${method.name}' has ${ifPoints.length} if-else branches evaluating the same variable. Replace with Strategy pattern.`, ast.filePath || '', method.startLine, undefined, method.name, undefined));
                            continue;
                        }
                    }
                    // Check switch-case
                    const switchPoints = dps.filter(d => d.type === 'switch');
                    for (const sp of switchPoints) {
                        const caseCount = dps.filter(d => d.type === 'case' && d.nestingDepth === sp.nestingDepth).length;
                        if (caseCount >= 4) {
                            violations.push(this.toViolation('missing-strategy', `Method '${method.name}' has a switch with ${caseCount} cases. Replace with Strategy/State pattern.`, ast.filePath || '', method.startLine, undefined, method.name, undefined));
                        }
                    }
                }
            }
        }
        return violations;
    }
    checkLeakingConstruction(asts) {
        const violations = [];
        const limit = this.config.constructionStatementLimit ?? 5;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                const isConfigClass = cls.annotations?.some(a => a.name === 'Configuration');
                if (isConfigClass)
                    continue;
                for (const method of cls.methods) {
                    // Report only the heaviest construction per method to avoid flooding nested-new sites.
                    let best;
                    for (const creation of method.createdObjects) {
                        if (this.BUILDER_PATTERN_RE.test(creation.className))
                            continue; // fluent builders
                        if (creation.className === 'Thread' || creation.className === 'Runnable')
                            continue; // anon/infra, covered by V306
                        const stmtCount = this.countConstructionStatements(creation);
                        const branching = creation.hasBranching === true;
                        const flagged = stmtCount > limit || branching;
                        if (flagged && (!best || (branching && !best.creation.hasBranching) || stmtCount > best.count)) {
                            best = { creation, count: stmtCount };
                        }
                    }
                    if (best) {
                        const { creation, count } = best;
                        const branchNote = creation.hasBranching === true
                            ? ` with branching logic (ternary/conditional) during construction`
                            : '';
                        violations.push(this.toViolation('leaking-construction', `Method '${method.name}' performs ${count} construction statements for '${creation.className}'${branchNote} (limit ${limit}). Extract a Builder or Factory.`, ast.filePath || '', creation.lineNumber, undefined, method.name, undefined, creation.className));
                    }
                }
            }
        }
        return violations;
    }
    /** Construction complexity: base `new` + count of nested `new` and multi-arg constructor calls. */
    countConstructionStatements(creation) {
        let count = 1;
        for (const arg of creation.constructorArgs || []) {
            const text = String(arg);
            if (text.includes('new '))
                count += 2; // nested object construction
            else if (text.includes('(') || text.includes(','))
                count += 1; // chained/compound args
            else
                count += 1;
        }
        return count;
    }
    checkFatInterface(asts, allAsts) {
        const violations = [];
        const limit = this.config.fatInterfaceMethodLimit ?? 10;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                if (cls.classType !== 'interface')
                    continue;
                const fqcn = cls.fullyQualifiedName || cls.className;
                const declaredMethods = cls.methods || [];
                const declared = declaredMethods.length;
                if (declared > limit) {
                    violations.push(this.toViolation('fat-interface', `Interface '${cls.className}' declares ${declared} methods (limit ${limit}). Consider splitting by responsibility (ISP).`, ast.filePath || '', cls.startLine, undefined, undefined, undefined, fqcn));
                    continue;
                }
                // Alternative trigger: clients use <50% of the declared methods. Requires a
                // reasonable surface (>=4 methods) so tiny untouched interfaces are not flagged.
                if (declared < 4)
                    continue;
                const declNames = new Set(declaredMethods.map(m => m.name));
                const relatedTypes = this.collectImplementationTypeNames(allAsts, cls.className, fqcn);
                const used = this.collectUsedInterfaceMethods(allAsts, relatedTypes, declNames);
                const ratio = used.size / declared;
                if (ratio < this.INTERFACE_USAGE_RATIO_THRESHOLD) {
                    violations.push(this.toViolation('fat-interface', `Interface '${cls.className}' declares ${declared} methods but only ${used.size} (${Math.round(ratio * 100)}%) are used by clients (threshold ${Math.round(this.INTERFACE_USAGE_RATIO_THRESHOLD * 100)}%). Consider splitting by responsibility (ISP).`, ast.filePath || '', cls.startLine, undefined, undefined, undefined, fqcn));
                }
            }
        }
        return violations;
    }
    /** Simple names of the interface plus every project class that implements it. */
    collectImplementationTypeNames(allAsts, className, fqcn) {
        const names = new Set([className, fqcn.split('.').pop() || className]);
        for (const ast of allAsts) {
            for (const c of ast.classes) {
                if (c.classType === 'interface')
                    continue;
                for (const impl of c.interfaces || []) {
                    const last = impl.split('.').pop() || impl;
                    if (last === className || impl === fqcn || impl === className) {
                        names.add(c.className);
                        names.add(c.fullyQualifiedName?.split('.').pop() || c.className);
                    }
                }
            }
        }
        return names;
    }
    /** Interface methods actually referenced via an interface- or implementation-typed receiver. */
    collectUsedInterfaceMethods(allAsts, relatedTypes, declNames) {
        const used = new Set();
        for (const ast of allAsts) {
            for (const c of ast.classes) {
                for (const m of c.methods) {
                    for (const call of m.calledMethods || []) {
                        const receiver = (call.receiverType || call.targetClass || '').replace(/<.*>/g, '').trim().split('.').pop() || '';
                        if (relatedTypes.has(receiver) && declNames.has(call.calledMethodName)) {
                            used.add(call.calledMethodName);
                        }
                    }
                }
            }
        }
        return used;
    }
    checkMissingCommand(asts) {
        const violations = [];
        const complexityThreshold = this.config.missingCommandComplexityThreshold ?? 6;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    if (method.annotations?.some(a => a.name === 'Transactional'))
                        continue; // declarative boundary exists
                    const writes = method.body?.persistenceWrites || [];
                    const distinctWrites = new Set(writes.map(w => w.call)).size;
                    if (distinctWrites < this.COMMAND_WRITE_COUNT_THRESHOLD)
                        continue;
                    const complexity = method.complexityMetrics?.cyclomaticComplexity ?? 1;
                    if (complexity < complexityThreshold)
                        continue;
                    violations.push(this.toViolation('missing-command', `Method '${method.name}' sequences ${distinctWrites} persistence writes at cyclomatic ${complexity}. Encapsulate as a Command (or @Transactional).`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    checkMissingPrototype(asts) {
        const violations = [];
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const pairs = this.countCopyPairs(method.calledMethods || []);
                    if (pairs < this.COPY_PAIR_THRESHOLD)
                        continue;
                    violations.push(this.toViolation('missing-prototype', `Method '${method.name}' manually copies ${pairs} field(s) via getter→setter between objects of the same type. Use a clone()/copy constructor (Prototype).`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    /** Counts correlated a.setX(b.getX()) pairs where a/b are different receivers of the same resolved type. */
    countCopyPairs(calls) {
        const setters = calls.filter(c => /^set[A-Z]/.test(c.calledMethodName) && c.receiverVariableName && c.receiverType);
        const getters = calls.filter(c => /^get[A-Z]/.test(c.calledMethodName) && c.receiverVariableName && c.receiverType);
        let pairs = 0;
        for (const s of setters) {
            const prop = s.calledMethodName.replace(/^set/, '');
            const g = getters.find(gc => gc.receiverVariableName !== s.receiverVariableName
                && gc.receiverType === s.receiverType
                && gc.calledMethodName.replace(/^get/, '') === prop);
            if (g)
                pairs++;
        }
        return pairs;
    }
    // ─── V312 Fragmented Concrete Factories ──────────────────────────
    checkFragmentedFactories(asts, allAsts) {
        const violations = [];
        const factories = allAsts.flatMap(ast => ast.classes)
            .filter(c => /Factory$/.test(c.className))
            .filter(c => c.classType === 'class')
            .filter(c => !(c.interfaces?.length) && (!c.superClass || c.superClass === 'java.lang.Object'))
            .filter(c => c.methods.some(m => (m.createdObjects || []).length > 0));
        if (factories.length < 2)
            return violations;
        const targets = new Set(factories.flatMap(f => f.methods.flatMap(m => m.createdObjects.map(co => co.className))));
        for (const f of factories) {
            for (const ast of asts) {
                const owner = ast.classes.find(c => c.className === f.className);
                if (!owner)
                    continue;
                violations.push(this.toViolation('fragmented-factories', `Factory '${f.className}' is a standalone concrete factory (no common factory interface). ${factories.length} such factories create ${targets.size} product types — centralize behind an Abstract Factory hierarchy.`, ast.filePath || '', owner.startLine, undefined, undefined, undefined, f.className));
                break;
            }
        }
        return violations;
    }
    checkMissingDecorator(asts) {
        const violations = [];
        const limit = this.config.crossCuttingCallLimit ?? 2;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                if (cls.annotations?.some(a => a.name === 'Configuration'))
                    continue;
                for (const method of cls.methods) {
                    const calls = method.calledMethods || [];
                    const cross = calls.filter(c => this.CROSS_CUTTING_TYPE_RE.test((c.receiverType || '').replace(/<.*>/g, '').split('.').pop() || '')
                        && this.CROSS_CUTTING_CALL_RE.test(c.calledMethodName));
                    if (cross.length < limit)
                        continue;
                    const business = calls.filter(c => !this.CROSS_CUTTING_TYPE_RE.test((c.receiverType || '').split('.').pop() || ''));
                    if (business.length < 1)
                        continue;
                    violations.push(this.toViolation('missing-decorator', `Method '${method.name}' interleaves ${cross.length} cross-cutting ${cross[0].receiverType?.split('.').pop()} call(s) with business logic. Extract into a Decorator/AOP advisor.`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    // ─── V314 Missing Composite (instanceof + recursive loop) ────────
    checkMissingComposite(asts) {
        const violations = [];
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const dps = method.complexityMetrics?.decisionPoints || [];
                    const hasLoop = dps.some(d => d.type === 'for' || d.type === 'while' || d.type === 'do-while');
                    if (!hasLoop)
                        continue;
                    const instanceOfChecks = dps.filter(d => /instanceof/i.test(d.condition || ''));
                    if (instanceOfChecks.length < 2)
                        continue;
                    violations.push(this.toViolation('missing-composite', `Method '${method.name}' handles leaves vs. containers heterogeneously (${instanceOfChecks.length} instanceof checks inside a loop). Introduce a uniform Component interface (Composite).`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    // ─── V315 Redundant Memory Footprint (allocations in loops) ──────
    checkRedundantMemory(asts) {
        const violations = [];
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const missingInLoop = (method.createdObjects || []).filter(c => c.insideLoop === true);
                    if (!missingInLoop.length)
                        continue;
                    const target = missingInLoop[0];
                    violations.push(this.toViolation('redundant-memory', `Method '${method.name}' allocates ${missingInLoop.length} instance(s) of '${target.className}' inside a loop — hoist/reuse (Flyweight) to reduce memory pressure.`, ast.filePath || '', target.lineNumber, undefined, method.name, undefined, target.className));
                }
            }
        }
        return violations;
    }
    checkScatteredStateMachine(asts, allAsts) {
        const violations = [];
        const limit = this.config.stateMachineClassLimit ?? 3;
        const affected = new Set();
        for (const ast of allAsts) {
            for (const cls of ast.classes) {
                const hasStateCondition = cls.methods.some(m => (m.complexityMetrics?.decisionPoints || []).some(d => this.STATE_CONDITION_RE.test(d.condition || '')));
                if (hasStateCondition)
                    affected.add(cls.fullyQualifiedName);
            }
        }
        if (affected.size < limit)
            return violations;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const stateChecks = (method.complexityMetrics?.decisionPoints || []).filter(d => this.STATE_CONDITION_RE.test(d.condition || ''));
                    if (!stateChecks.length)
                        continue;
                    violations.push(this.toViolation('scattered-state-machine', `Method '${method.name}' hardcodes state comparisons (${stateChecks.length}) while state logic is scattered across ${affected.size} classes. Encapsulate transitions in State objects.`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    // ─── V317 Duplicate Algorithm Structure (template method) ────────
    checkDuplicateAlgorithm(asts, allAsts) {
        const violations = [];
        const similarity = this.config.templateMethodSimilarity ?? 0.8;
        const methods = [];
        for (const ast of allAsts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    if ((method.calledMethods || []).length < 4)
                        continue;
                    methods.push({ ast, cls, method });
                }
            }
        }
        const flagged = new Set();
        for (let i = 0; i < methods.length; i++) {
            for (let j = i + 1; j < methods.length; j++) {
                const a = methods[i], b = methods[j];
                if (a.cls.fullyQualifiedName === b.cls.fullyQualifiedName)
                    continue;
                const seqA = a.method.calledMethods, seqB = b.method.calledMethods;
                const sim = this.sequenceSimilarity(seqA, seqB);
                if (sim < similarity)
                    continue;
                const differs = seqA.some((ca, idx) => (ca.receiverType || '') !== (seqB[idx]?.receiverType || ''));
                if (!differs)
                    continue;
                for (const m of [a, b]) {
                    if (flagged.has(m.method))
                        continue;
                    flagged.add(m.method);
                    violations.push(this.toViolation('duplicate-algorithm', `Method '${m.method.name}' (${m.cls.className}) is ${Math.round(sim * 100)}% structurally identical to '${a.method.name}'/'${b.method.name}' with differing sub-steps. Extract a Template Method.`, m.ast.filePath || '', m.method.startLine, undefined, m.method.name));
                }
            }
        }
        return violations;
    }
    sequenceSimilarity(a, b) {
        const s1 = a.map(c => c.calledMethodName);
        const s2 = b.map(c => c.calledMethodName);
        if (!s1.length || !s2.length)
            return 0;
        const lcs = (x, y) => {
            const m = x.length, n = y.length;
            const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
            for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                    dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
            return dp[m][n];
        };
        const lcsLen = lcs(s1, s2);
        return (2 * lcsLen) / (s1.length + s2.length);
    }
    checkHardcodedNotifier(asts) {
        const violations = [];
        const limit = this.config.notifierTargetLimit ?? 3;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const targets = new Set();
                    for (const call of method.calledMethods || []) {
                        const type = (call.receiverType || '').replace(/<.*>/g, '').trim().split('.').pop() || '';
                        if (this.NOTIFIER_TYPE_RE.test(type) && this.NOTIFIER_METHOD_RE.test(call.calledMethodName)) {
                            targets.add(type);
                        }
                    }
                    if (targets.size < limit)
                        continue;
                    violations.push(this.toViolation('hardcoded-notifier', `Method '${method.name}' directly invokes ${targets.size} notification services ([${[...targets].join(', ')}]) on a state change. Decouple via an Observer/event bus.`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    // ─── V319 Monolithic Pipeline (guard chains) ─────────────────────
    checkMonolithicPipeline(asts) {
        const violations = [];
        const limit = this.config.guardClauseLimit ?? 5;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const dps = method.complexityMetrics?.decisionPoints || [];
                    const topLevel = dps.filter(d => d.type === 'if' && ((d.nestingDepth ?? 0) <= 1));
                    if (topLevel.length < limit)
                        continue;
                    violations.push(this.toViolation('monolithic-pipeline', `Method '${method.name}' runs ${topLevel.length} sequential guard/validation clauses. Decompose into a Chain-of-Responsibility pipeline.`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    checkServiceLocator(asts) {
        const violations = [];
        for (const ast of asts) {
            const isConfig = ast.classes.some(c => c.annotations?.some(a => a.name === 'Configuration'));
            if (isConfig)
                continue;
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    for (const call of method.calledMethods || []) {
                        const type = (call.receiverType || '').replace(/<.*>/g, '').trim().split('.').pop() || '';
                        if (this.SERVICE_LOCATOR_TYPE_RE.test(type) && this.SERVICE_LOCATOR_METHOD_RE.test(call.calledMethodName)) {
                            violations.push(this.toViolation('service-locator', `Method '${method.name}' fetches '${type}.${call.calledMethodName}()' dynamically (Service Locator). Inject the dependency instead.`, ast.filePath || '', call.lineNumber, undefined, method.name, undefined, type));
                        }
                    }
                }
            }
        }
        return violations;
    }
    // ─── V321 Excessive Defensive Null Checking ──────────────────────
    checkExcessiveNullChecks(asts) {
        const violations = [];
        const limit = this.config.nullCheckLimit ?? 3;
        for (const ast of asts) {
            for (const cls of ast.classes) {
                for (const method of cls.methods) {
                    const nullChecks = (method.complexityMetrics?.decisionPoints || [])
                        .filter(d => /(==|!=)\s*null|null\s*(==|!=)/i.test(d.condition || ''));
                    if (nullChecks.length < limit)
                        continue;
                    violations.push(this.toViolation('excessive-null-checks', `Method '${method.name}' performs ${nullChecks.length} defensive null checks. Return Null Objects / empty collections (or Optional) instead.`, ast.filePath || '', method.startLine, undefined, method.name));
                }
            }
        }
        return violations;
    }
    // ─── Helpers ─────────────────────────────────────────────────────
    matchLayer(filePath) {
        const boundaries = this.config.layerBoundaries;
        if (!boundaries)
            return null;
        const normalized = filePath.replace(/\\/g, '/');
        for (const [name, boundary] of Object.entries(boundaries)) {
            for (const pattern of boundary.packages) {
                if (this.simpleGlobMatch(normalized, pattern))
                    return name;
            }
        }
        return null;
    }
    simpleGlobMatch(path, pattern) {
        const regexStr = '^' + pattern
            .replace(/\*\*/g, '___DS___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DS___/g, '.*')
            .replace(/\?/g, '.') + '$';
        try {
            return new RegExp(regexStr).test(path);
        }
        catch {
            return path.includes(pattern.replace(/\*\*/g, '').replace(/\*/g, ''));
        }
    }
    getClassName(ast) {
        return ast.classes[0]?.className || ast.filePath?.split('/').pop()?.replace('.java', '') || 'Unknown';
    }
}
exports.DesignPatternAnalyzer = DesignPatternAnalyzer;
//# sourceMappingURL=designPatternAnalyzer.js.map