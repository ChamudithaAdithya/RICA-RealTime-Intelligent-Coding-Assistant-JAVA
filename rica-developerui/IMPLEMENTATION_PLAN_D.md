# Implementation Plan D — GoF Design Pattern Compliance Engine

**Goal:** Detect Gang-of-Four design pattern violations and missing pattern applications automatically, using RICA's existing AST infrastructure.

**Reference:** *Design Patterns: Elements of Reusable Object-Oriented Software* (Gamma, Helm, Johnson, Vlissides)

---

## 0. Rationale — Why Patterns Matter for Static Analysis

Design patterns are not style preferences — they are **proven structural solutions** to recurring coupling problems. When a developer misses a pattern, the codebase degrades along predictable dimensions:

| Degradation | Pattern Missing | Consequence |
|---|---|---|
| Monolithic service | Facade → God Object | 5k-line service, untestable, no isolation |
| Infinite if-else chain | Strategy | Open-Closed Principle violated, every new case modifies existing code |
| Raw `new` in business layer | Factory | Caller pinned to concrete class, DI bypassed |
| Static mutable maps | Singleton (misused) | Thread-safety bugs, untestable global state |
| External SDK in domain | Adapter | Framework lock-in, impossible to swap implementations |
| Raw thread spawn | Command | No lifecycle management, no monitoring |

Each of these can be expressed as a **structural rule** against RICA's existing AST (Method, ClassInfo, DependencyGraph).

---

## 1. Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │           DesignPatternAnalyzer             │
                    │  (orchestrator — like CrossFileAnalyzer)    │
                    └──────┬──────┬──────┬──────┬──────┬─────────┘
                           │      │      │      │      │
              ┌────────────┘      │      │      │      └────────────┐
              ▼                   ▼      ▼      ▼                   ▼
      ┌──────────────┐   ┌──────────┐ ┌──────┐ ┌──────┐   ┌──────────────┐
      │ AdapterRule   │   │GodFacade │ │Strat-│ │Fact- │   │ MissingAbstr.│
      │ V301          │   │Rule V302 │ │egy   │ │ory   │   │ Rule V307    │
      └──────────────┘   └──────────┘ │Rule  │ │Rule  │   └──────────────┘
                                      │V303  │ │V304  │
      ┌──────────────┐   ┌──────────┐ └──────┘ └──────┘   ┌──────────────┐
      │MutableSingle- │   │RawThread │                      │   ...more    │
      │ton Rule V305  │   │Rule V306 │                      │   V308+      │
      └──────────────┘   └──────────┘                      └──────────────┘
```

### Integration Points

| Component | Change Required |
|---|---|
| `analyzerConfig.ts` | `enableDesignPatternChecks` flag **already exists** — no change |
| `violationManager.ts` | Add `DesignPatternAnalyzer` instance; wire into `update()` and `onFileSaved()` |
| `RULE_CODE_MAP` | Add V301–V307 entries |
| `MITIGATION_HINTS` | Add hints for each new rule type |

### Wiring in `violationManager.ts`

```typescript
// New import
import { DesignPatternAnalyzer, DesignPatternViolation } from './designPatternAnalyzer';

// In constructor
this.designPatternAnalyzer = new DesignPatternAnalyzer(configProvider);

// In update() — Stage 4 (after package boundary)
if (this.config.enableDesignPatternChecks) {
    const dpViolations = this.designPatternAnalyzer.analyze(allAsts, this.graph);
    unifiedViolations.push(...dpViolations);
}

// In onFileSaved() — after package boundary analysis
if (this.config.enableDesignPatternChecks) {
    const dpViolations = this.designPatternAnalyzer.analyze(fileAsts, this.graph, this.filesMap);
    designPatternViolations = dpViolations;
}
```

---

## 2. Rule Catalog — V301 to V307

### V301 — Adapter Missing (Structural)

| Field | Value |
|---|---|
| **Code** | RICA-V301 |
| **Severity** | `error` |
| **Detects** | Business-layer classes importing third-party SDK types directly instead of wrapping them behind a port/adapter |
| **Pattern Intent** | The Adapter pattern converts the interface of a class into another interface clients expect |

**Detection Logic:**

```typescript
analyze(asts: FullASTOutput[], graph: ProjectDependencyGraph): DesignPatternViolation[] {
    const EXTERNAL_PACKAGES = [
        'org.apache.http', 'org.apache.hc',
        'io.netty',
        'com.squareup.okhttp', 'com.squareup.retrofit',
        'com.fasterxml.jackson',
        'redis.clients', 'io.lettuce',
        'com.rabbitmq', 'org.apache.kafka',
        'software.amazon.awssdk', 'com.amazonaws',
        'com.google.cloud',
        'org.elasticsearch', 'co.elastic.clients',
        'org.mongodb', 'org.neo4j',
    ];
    for (const ast of asts) {
        const fileLayer = this.matchLayer(ast.filePath, ...);
        if (fileLayer !== 'domain' && fileLayer !== 'application') continue;
        for (const imp of ast.imports || []) {
            if (EXTERNAL_PACKAGES.some(pkg => imp.qualifiedName.startsWith(pkg))) {
                // Check if a corresponding port/adapter exists in infrastructure
                const portExists = this.hasPortAdapter(graph, imp.qualifiedName);
                if (!portExists) {
                    violations.push({ type: 'missing-adapter', ... });
                }
            }
        }
    }
}
```

**Mitigation Hint:** *"Wrap the external library behind a Port interface in the `application/port/out/` package and create an Adapter implementation in `infrastructure/adapter/`. The business layer must not import SDK types directly."*

**AST Dependencies:** `FileAST.imports[].qualifiedName`, `ProjectDependencyGraph` (for port existence check)

**Effort:** 1-2 hours

---

### V302 — God Facade (Structural)

| Field | Value |
|---|---|
| **Code** | RICA-V302 |
| **Severity** | `warning` |
| **Detects** | Classes with excessive incoming dependencies AND large codebodies that merely delegate — the "God Service Siphon" anti-pattern |
| **Pattern Intent** | Facade provides a unified interface to a subsystem; it should delegate, not contain domain logic |

**Detection Logic:**

```typescript
// For each class node in the graph:
const inDegree = graph.getIncomingEdges(classFqn).length;
if (inDegree > 8) {
    const cls = findClass(classFqn, asts);
    if (cls && cls.bodyLines > 500) {
        let delegateCount = 0;
        for (const method of cls.methods) {
            if (method.calledMethods.length === 1 && method.createdObjects.length === 0
                && (method.body?.linesOfCode || 0) < 5) {
                delegateCount++;
            }
        }
        const delegateRatio = delegateCount / cls.methods.length;
        if (delegateRatio > 0.6) {
            violations.push({ type: 'god-facade', ... });
        }
    }
}
```

**Mitigation Hint:** *"This class is a God Facade — it has {N} incoming dependencies and {M}% of its methods are single-line delegations. Extract domain logic into domain objects and keep only orchestration here."*

**AST Dependencies:** `ProjectDependencyGraph.getIncomingEdges()`, `ClassInfo.methods[].calledMethods`, `classBodyInfo.linesOfCode`

**Effort:** 2-3 hours

---

### V303 — Strategy Missing (Behavioral)

| Field | Value |
|---|---|
| **Code** | RICA-V303 |
| **Severity** | `warning` |
| **Detects** | Methods containing long if-else chains or switch statements that evaluate the same variable — signalling a missing Strategy or State pattern |
| **Pattern Intent** | Strategy defines a family of interchangeable algorithms; long condition chains on the same discriminant violate Open-Closed |

**Detection Logic:**

```typescript
for (const method of cls.methods) {
    const dps = method.complexityMetrics?.decisionPoints || [];
    const ifCount = dps.filter(d => d.type === 'if' || d.type === 'else-if').length;
    const switchCount = dps.filter(d => d.type === 'switch').length;

    if (ifCount >= 4) {
        // Group if-statements by their condition variable (simplified heuristic)
        const conditions = dps.filter(d => d.type === 'if' || d.type === 'else-if')
            .map(d => d.condition)
            .filter(Boolean);
        const uniqueConditions = new Set(conditions);

        // If all if-conditions reference the same short variable/field name
        if (uniqueConditions.size <= 2 && conditions.length >= 4) {
            violations.push({ type: 'missing-strategy', ... });
            continue;
        }
    }

    if (switchCount >= 1) {
        const switchPoints = dps.filter(d => d.type === 'switch');
        for (const sp of switchPoints) {
            const caseCount = dps.filter(d => d.type === 'case'
                && d.nestingDepth === sp.nestingDepth).length;
            if (caseCount >= 4) {
                violations.push({ type: 'missing-strategy', ... });
                break;
            }
        }
    }
}
```

**Mitigation Hint:** *"Replace the {N}-branch conditional chain with a Strategy pattern. Each branch should be a separate class implementing a common interface, selected at runtime via factory or injection."*

**AST Dependencies:** `Method.complexityMetrics.decisionPoints[]` (with `type`, `condition`, `nestingDepth`)

**Effort:** 3-4 hours (condition variable tracking is the hardest part)

---

### V304 — Factory Missing (Creational)

| Field | Value |
|---|---|
| **Code** | RICA-V304 |
| **Severity** | `error` |
| **Detects** | Concrete class instantiated via `new` in multiple places within the business layer, when the type implements an interface or extends an abstract class |
| **Pattern Intent** | Factory Method / Abstract Factory let subclasses decide which class to instantiate; hardcoding `new` bypasses polymorphism |

**Detection Logic:**

```typescript
// Phase 1: Build concrete instantiation map per type
const instantiationCounts = new Map<string, Set<string>>(); // className → caller FQCNs

for (const ast of asts) {
    const fileLayer = this.matchLayer(ast.filePath, ...);
    if (fileLayer !== 'domain' && fileLayer !== 'application') continue;

    for (const cls of ast.classes) {
        for (const method of cls.methods) {
            for (const creation of method.createdObjects) {
                const target = creation.className;
                if (!target) continue;
                // Resolve to FQCN
                const targetFqcn = this.resolveFqcn(target, ast.imports, ast.packageInfo?.name);
                if (!targetFqcn) continue;

                if (!instantiationCounts.has(targetFqcn)) {
                    instantiationCounts.set(targetFqcn, new Set());
                }
                instantiationCounts.get(targetFqcn)!.add(cls.fullyQualifiedName);
            }
        }
    }
}

// Phase 2: Flag concretes instantiated from 3+ different callers when an interface exists
for (const [concrete, callers] of instantiationCounts) {
    if (callers.size >= 3) {
        const clsInfo = this.findClass(concrete, asts);
        if (clsInfo && (clsInfo.interfaces.length > 0 || clsInfo.superClass !== 'Object')) {
            violations.push({ type: 'missing-factory', targetType: concrete, callerCount: callers.size, ... });
        }
    }
}
```

**Mitigation Hint:** *"`{TargetClass}` is instantiated with `new` from {N} different callers. Extract a Factory — callers should depend on the interface `{InterfaceName}`, not the concrete class."*

**AST Dependencies:** `Method.createdObjects[].className`, `ClassInfo.interfaces`, `ClassInfo.superClass`, import resolution

**Effort:** 2-3 hours

---

### V305 — Mutable Singleton (Creational)

| Field | Value |
|---|---|
| **Code** | RICA-V305 |
| **Severity** | `warning` |
| **Detects** | Static mutable collection/state fields in classes outside the `infrastructure` layer |
| **Pattern Intent** | Singleton should manage shared state carefully; mutable static collections are usually a design smell (global mutable state) |

**Detection Logic:**

```typescript
for (const ast of asts) {
    for (const cls of ast.classes) {
        const fileLayer = this.matchLayer(ast.filePath, ...);
        if (fileLayer === 'infrastructure') continue; // infrastructure may have caches

        for (const field of cls.attributes) {
            if (field.isStatic && !field.isFinal) {
                const rawType = field.dataType.replace(/<.*>/g, '').trim();
                const mutableTypes = [
                    'HashMap', 'ConcurrentHashMap', 'LinkedHashMap', 'TreeMap',
                    'ArrayList', 'LinkedList', 'Vector', 'Stack',
                    'HashSet', 'LinkedHashSet', 'TreeSet',
                    'StringBuilder', 'StringBuffer',
                    'Map', 'List', 'Set', 'Collection',
                ];
                if (mutableTypes.includes(rawType)) {
                    violations.push({ type: 'mutable-singleton', fieldName: field.name, ... });
                }
            }
        }
    }
}
```

**Mitigation Hint:** *"Field `{fieldName}` is a static mutable collection. Replace with dependency-injected beans (`@Bean` scoped appropriately) or immutable configuration to avoid thread-safety and testability issues."*

**AST Dependencies:** `ClassInfo.attributes[].isStatic`, `isFinal`, `dataType`

**Effort:** 1 hour

---

### V306 — Raw Thread (Behavioral)

| Field | Value |
|---|---|
| **Code** | RICA-V306 |
| **Severity** | `error` |
| **Detects** | `new Thread()`, `Executors.*`, `new Runnable()` etc. in any layer outside explicitly marked `@Configuration` classes or `infrastructure` layer adapter |
| **Pattern Intent** | Command pattern encapsulates operations as objects; raw thread spawns bypass lifecycle management |

**Detection Logic:**

```typescript
const THREAD_TYPES = ['Thread', 'Runnable', 'Callable', 'ExecutorService', 'Executor',
    'Executors', 'ThreadPoolExecutor', 'ScheduledExecutorService', 'Future', 'FutureTask',
    'CompletableFuture', 'Timer', 'TimerTask', 'TaskScheduler'];

for (const ast of asts) {
    const fileLayer = this.matchLayer(ast.filePath, ...);
    if (fileLayer === 'infrastructure') {
        // Check if annotated @Configuration or clearly an adapter
        const isConfigClass = ast.classes.some(c =>
            c.annotations?.some(a => a.name === 'Configuration'));
        if (isConfigClass) continue;
    }

    for (const cls of ast.classes) {
        for (const method of cls.methods) {
            for (const creation of method.createdObjects) {
                if (THREAD_TYPES.includes(creation.className)) {
                    violations.push({ type: 'raw-thread', methodName: method.name,
                        targetType: creation.className, ... });
                }
            }
            for (const call of method.calledMethods) {
                const simpleName = call.targetClass?.split('.').pop() || '';
                if (call.calledMethodName === 'execute' && simpleName === 'Executors') {
                    violations.push({ type: 'raw-thread', methodName: method.name,
                        targetType: 'Executors', ... });
                }
            }
        }
    }
}
```

**Mitigation Hint:** *"Method `{methodName}` spawns a raw `{targetType}`. Use `@Async` or a `TaskExecutor` bean instead — this gives you lifecycle management, monitoring, and thread-pool configuration."*

**AST Dependencies:** `Method.createdObjects[]`, `Method.calledMethods[]`

**Effort:** 1 hour (extends V112 logic)

---

### V307 — Missing Abstraction (Structural)

| Field | Value |
|---|---|
| **Code** | RICA-V307 |
| **Severity** | `info` |
| **Detects** | Interfaces or abstract classes with exactly one concrete implementation — YAGNI violation or missing abstraction |
| **Pattern Intent** | Interface/abstract class exists to enable polymorphism; a single implementation suggests premature abstraction or incomplete refactoring |

**Detection Logic:**

```typescript
// Build implementation map from graph relationships
const implMap = new Map<string, string[]>(); // interface/abstract → concrete classes

for (const ast of asts) {
    for (const cls of ast.classes) {
        for (const iface of cls.interfaces) {
            if (!implMap.has(iface)) implMap.set(iface, []);
            implMap.get(iface)!.push(cls.fullyQualifiedName);
        }
        if (cls.superClass && cls.superClass !== 'Object' && cls.superClass !== 'Enum'
            && cls.superClass !== 'Record') {
            // Check if super is abstract
            if (!implMap.has(cls.superClass)) implMap.set(cls.superClass, []);
            implMap.get(cls.superClass)!.push(cls.fullyQualifiedName);
        }
    }
}

for (const [abstraction, implementations] of implMap) {
    if (implementations.length === 1) {
        const absClass = this.findClass(abstraction, asts);
        if (absClass && (absClass.classType === 'interface' || absClass.isAbstract)) {
            violations.push({ type: 'missing-abstraction', targetType: abstraction, ... });
        }
    }
}
```

**Mitigation Hint:** *"Interface/abstract class `{TargetType}` has only one implementation. Either this abstraction is unnecessary (YAGNI — consider inlining), or you need additional implementations to justify the indirection."*

**AST Dependencies:** `ClassInfo.interfaces[]`, `ClassInfo.superClass`, `ClassInfo.classType`, `ClassInfo.isAbstract`

**Effort:** 1-2 hours

---

## 3. New File Structure

```
src/
  designPatternAnalyzer.ts            ← New: orchestrator
  rules/                              ← New directory (or inline in designPatternAnalyzer.ts)
    adapterRule.ts                    ← V301
    godFacadeRule.ts                  ← V302
    strategyRule.ts                   ← V303
    factoryRule.ts                    ← V304
    singletonRule.ts                  ← V305
    rawThreadRule.ts                  ← V306
    missingAbstractionRule.ts         ← V307
  violationManager.ts                 ← Modified: wire new analyzer
```

For the V1 implementation, all rules can be implemented **inline in a single `designPatternAnalyzer.ts` file** (like `controllerLayerDetector.ts` does with its 6 violation types). The per-rule file split is a V2 refactoring.

---

## 4. Code Registry Additions

In `violationManager.ts`:

```typescript
// Add to RULE_CODE_MAP:
'missing-adapter': 'RICA-V301',
'god-facade': 'RICA-V302',
'missing-strategy': 'RICA-V303',
'missing-factory': 'RICA-V304',
'mutable-singleton': 'RICA-V305',
'raw-thread': 'RICA-V306',
'missing-abstraction': 'RICA-V307',

// Add to MITIGATION_HINTS:
'missing-adapter': 'Wrap external dependency behind a Port interface — create an infrastructure Adapter',
'god-facade': 'Decompose this facade — domain logic belongs in domain objects, not orchestration',
'missing-strategy': 'Replace conditional chain with Strategy pattern — each branch should be a separate implementation class',
'missing-factory': 'Extract object creation behind a Factory — callers should depend on the interface, not the concrete class',
'mutable-singleton': 'Replace static mutable state with DI-scoped beans or immutable configuration',
'raw-thread': 'Use @Async or TaskExecutor instead of raw thread management',
'missing-abstraction': 'Consider if this abstraction is necessary — add implementations or inline it',
```

---

## 5. Implementation Order (Recommended)

| Step | What | Effort | Dependencies |
|---|---|---|---|
| **1** | Create `DesignPatternAnalyzer` class shell + wire into `violationManager.ts` (all 7 rules return empty arrays initially) | 30 min | None |
| **2** | **V306 Raw Thread** — move thread detection from `ControllerLayerAnalyzer` into the new rule, extend to all layers | 30 min | Step 1 |
| **3** | **V305 Mutable Singleton** — static field check, simple AST traversal | 30 min | Step 1 |
| **4** | **V301 Adapter Missing** — import matching against known SDK prefixes | 1 hr | Step 1 |
| **5** | **V307 Missing Abstraction** — graph-based interface/impl counting | 1 hr | Step 1, Graph |
| **6** | **V304 Factory Missing** — createdObjects aggregation + caller counting | 1.5 hr | Step 1, Graph |
| **7** | **V302 God Facade** — in-degree + LOC + delegation ratio | 2 hr | Step 1, Graph |
| **8** | **V303 Strategy Missing** — decision-point chain analysis | 3 hr | Step 1, ComplexityMetrics |
| **9** | Tests + edge-case hardening | 2 hr | All steps |

**Total V1:** ~12 hours  
**Quick wins (Steps 1-3):** ~1.5 hours

---

## 6. Test Plan

| Test | Pattern | Input | Expected |
|---|---|---|---|
| `V306_raw_thread_in_service` | Command | Service method creates `new Thread()` | 1 violation |
| `V306_raw_thread_in_config` | Command | `@Configuration` class creates `ExecutorService` | 0 violations |
| `V305_static_hashmap_in_controller` | Singleton | Controller with `static Map<...> cache = new HashMap<>()` | 1 violation |
| `V305_static_final_string` | Singleton | `static final String FOO = "bar"` | 0 violations |
| `V301_apache_http_in_service` | Adapter | Service imports `org.apache.http.client.HttpClient` | 1 violation |
| `V301_apache_http_in_adapter` | Adapter | Infrastructure adapter imports same | 0 violations |
| `V307_interface_one_impl` | Missing Abstraction | Interface with exactly 1 `implements` | 1 violation |
| `V307_interface_zero_impl` | Missing Abstraction | Interface with 0 implementations | 0 violations (skip) |
| `V304_new_in_three_callers` | Factory | Same concrete instantiated in 3 different service methods | 1 violation |
| `V302_god_facade` | Facade | 15 incoming edges, 600 LOC, 80% delegation | 1 violation |
| `V303_if_chain_4_branches` | Strategy | Method with 4 `if (type == ...)` branches | 1 violation |
| `V303_switch_5_cases` | Strategy | Method with switch on enum with 5 cases | 1 violation |

---

## 7. Future Extensions (V2)

| Rule | Code | Description | Effort |
|---|---|---|---|
| Builder Missing | **V308** | Constructor with ≥5 parameters of same type (telescoping constructor anti-pattern) | 1 hr |
| Decorator Chain | **V309** | Wrapper class that delegates all methods without adding behavior | 1.5 hr |
| Proxy Bypass | **V310** | Direct access to a resource that should go through a proxy (e.g., service bypassing cache layer) | 2 hr |
| State vs. Switch | **V311** | Method switches on object state to determine behavior — should use State pattern | 2 hr |
| Observer Leak | **V312** | Event listener registered but never unregistered (memory leak pattern) | 2 hr |
| Template Method | **V313** | Two sibling classes share >70% method implementation — should extract template | 2 hr |
| Visitor Missing | **V314** | Instanceof chain across a type hierarchy — should use Visitor pattern | 3 hr |

---

## 8. Success Criteria

- [ ] All 7 rules produce correct results against known-positive and known-negative test cases
- [ ] Zero false positives on the Simlea codebase's existing clean patterns
- [ ] `enableDesignPatternChecks` toggle works (off by default, on enables all 7)
- [ ] No regression in existing 62 mocha tests
- [ ] Each violation message follows the 5-part blueprint (broken boundary, artifact, mitigation, reason, detection context)
