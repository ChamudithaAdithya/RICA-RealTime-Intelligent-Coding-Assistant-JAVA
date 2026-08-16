"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceLayerAnalyzer = void 0;
class ServiceLayerAnalyzer {
    constructor() {
        // Map of fully qualified class name to its layer and class info
        this.classLayers = new Map();
        this.classMap = new Map();
        // Map of simple class name to possible fully qualified names (for ambiguous resolution)
        this.simpleNameMap = new Map();
        // Known repository/dao patterns
        this.repositoryPatterns = ['Repository', 'Dao', 'DAO', 'Persistence', 'PersistenceImpl', 'RepositoryImpl'];
        // Patterns for other infrastructure layers
        this.infrastructurePatterns = ['Client', 'Gateway', 'Connector', 'Producer', 'Consumer'];
    }
    analyze(astOutputs) {
        const violations = [];
        // Build lookup maps from all classes
        this.buildClassMaps(astOutputs);
        // Analyze each service class
        for (const ast of astOutputs) {
            for (const cls of ast.classes) {
                if (cls.detectedLayer !== 'service') {
                    continue;
                }
                // Check field-level repository injection
                for (const field of cls.attributes) {
                    if (this.isRepositoryType(field.dataType) && !field.isInjected) {
                        violations.push({
                            type: 'uninjected-repository-access',
                            message: `Service class '${cls.className}' has uninjected repository field '${field.name}' of type ${field.dataType}. Annotate with @Autowired/@Inject/@Resource.`,
                            className: cls.fullyQualifiedName,
                            fieldName: field.name,
                            severity: 'error',
                            filePath: ast.filePath,
                            range: field.startLine ? {
                                start: { line: field.startLine, character: field.startColumn || 0 },
                                end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
                            } : undefined,
                            explanation: 'Your service class declares a repository field without injecting it through the framework. With dependency injection, the container provides the repository instance automatically; without it, you either get a null pointer at runtime or have to manage object creation yourself, which couples your service to concrete implementations and makes unit testing difficult.'
                        });
                    }
                }
                // Analyze each method
                for (const method of cls.methods) {
                    // Skip abstract methods
                    if (method.methodType === 'abstract')
                        continue;
                    // Check method calls
                    for (const call of method.calledMethods) {
                        if (!call.targetClass)
                            continue;
                        // Resolve target class FQCN if needed
                        const targetFQCN = this.resolveTypeName(call.targetClass, ast.imports, ast.packageInfo?.name);
                        if (!targetFQCN)
                            continue;
                        // Check if target is a repository or infrastructure
                        const targetInfo = this.classMap.get(targetFQCN);
                        const targetLayer = this.classLayers.get(targetFQCN);
                        const isRepoByLayer = targetLayer === 'repository' || targetLayer === 'dao';
                        const isRepoByName = this.isRepositoryClassName(targetFQCN.split('.').pop() || '');
                        const isInfrastructure = this.isInfrastructureClassName(targetFQCN.split('.').pop() || '');
                        if (isRepoByLayer || isRepoByName) {
                            if (!call.receiverIsInjected) {
                                violations.push({
                                    type: 'uninjected-repository-access',
                                    message: `Service method '${method.name}' accesses repository '${targetFQCN}' via uninjected field/parameter. Use dependency injection.`,
                                    className: cls.fullyQualifiedName,
                                    methodName: method.name,
                                    receiverVariable: call.receiverVariableName,
                                    lineNumber: call.lineNumber,
                                    range: call.lineNumber ? {
                                        start: { line: call.lineNumber, character: call.column || 0 },
                                        end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) },
                                    } : undefined,
                                    severity: 'error',
                                    filePath: ast.filePath,
                                    explanation: 'Your service method accesses a repository through an uninjected field or parameter. The framework should supply this dependency so your service stays decoupled from how the repository is created or configured, and so you can easily swap in mocks during testing.'
                                });
                            }
                        }
                        else if (isInfrastructure && !call.receiverIsInjected) {
                            // Infrastructure clients should also be injected
                            violations.push({
                                type: 'uninjected-repository-access',
                                message: `Service method '${method.name}' calls infrastructure class '${targetFQCN}' via uninjected field/parameter.`,
                                className: cls.fullyQualifiedName,
                                methodName: method.name,
                                receiverVariable: call.receiverVariableName,
                                lineNumber: call.lineNumber,
                                range: call.lineNumber ? {
                                    start: { line: call.lineNumber, character: call.column || 0 },
                                    end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) },
                                } : undefined,
                                severity: 'warning',
                                filePath: ast.filePath,
                                explanation: 'Your service method calls an infrastructure class through a field or parameter that was not injected. Infrastructure classes like clients and gateways should be injected just like repositories, keeping your service unaware of their lifecycle and making it straightforward to replace them with test doubles.'
                            });
                        }
                    }
                    // Check object creations (self-instantiation)
                    for (const creation of method.createdObjects) {
                        const className = creation.className;
                        if (this.isRepositoryClassName(className) || this.isInfrastructureClassName(className)) {
                            violations.push({
                                type: 'self-instantiation',
                                message: `Service method '${method.name}' instantiates ${this.isRepositoryClassName(className) ? 'repository' : 'infrastructure'} class '${className}' directly. Use dependency injection.`,
                                className: cls.fullyQualifiedName,
                                methodName: method.name,
                                lineNumber: creation.lineNumber,
                                range: creation.lineNumber ? {
                                    start: { line: creation.lineNumber, character: 0 },
                                    end: { line: creation.lineNumber, character: 80 },
                                } : undefined,
                                severity: 'error',
                                filePath: ast.filePath,
                                explanation: 'Your service method directly instantiates a repository or infrastructure class using "new" instead of asking the DI container for it. This bypasses the injection framework entirely, making the dependency hard-coded and preventing you from substituting alternative implementations or mocking it in tests.'
                            });
                        }
                    }
                }
                // Check for anemic service (once per class)
                if (this.isAnemicService(cls)) {
                    violations.push({
                        type: 'anemic-service',
                        message: `Service class '${cls.className}' is anemic: its methods are trivial accessors or pure delegation with no business logic. Consider moving domain logic into this service.`,
                        className: cls.fullyQualifiedName,
                        severity: 'warning',
                        filePath: ast.filePath,
                        range: cls.startLine ? {
                            start: { line: cls.startLine, character: cls.startColumn || 0 },
                            end: { line: cls.endLine || cls.startLine, character: cls.endColumn || (cls.startColumn || 0) + 1 },
                        } : undefined,
                        explanation: 'Your service class contains no meaningful business logic — just getters/setters or pass-through delegation. Services are the natural home for business rules; move behavior (validation, calculations, orchestration) into this class so the logic is testable and reusable, instead of living in controllers or entities.'
                    });
                }
            }
        }
        return violations;
    }
    buildClassMaps(astOutputs) {
        this.classLayers.clear();
        this.classMap.clear();
        this.simpleNameMap.clear();
        for (const ast of astOutputs) {
            for (const cls of ast.classes) {
                const fqcn = cls.fullyQualifiedName;
                const layer = cls.detectedLayer || 'unknown';
                this.classLayers.set(fqcn, layer);
                this.classMap.set(fqcn, cls);
                const simple = cls.className;
                if (!this.simpleNameMap.has(simple)) {
                    this.simpleNameMap.set(simple, new Set());
                }
                this.simpleNameMap.get(simple).add(fqcn);
            }
        }
    }
    resolveTypeName(typeName, imports, currentPackage) {
        // If typeName contains a dot or looks fully qualified (e.g., com.example.Foo), assume it's FQCN
        if (typeName.includes('.')) {
            return typeName;
        }
        // Try to find in imports (exact simple name match)
        for (const imp of imports) {
            if (imp.simpleName === typeName && !imp.isWildcard) {
                return imp.qualifiedName;
            }
        }
        // If currentPackage is provided, check for classes in the same package (no import needed)
        if (currentPackage) {
            const candidates = this.simpleNameMap.get(typeName);
            if (candidates) {
                const effectiveCurrent = currentPackage === 'default' ? '' : currentPackage;
                const samePackageCandidates = Array.from(candidates).filter(fqcn => {
                    const lastDot = fqcn.lastIndexOf('.');
                    const pkg = lastDot > 0 ? fqcn.substring(0, lastDot) : '';
                    return pkg === effectiveCurrent;
                });
                if (samePackageCandidates.length === 1) {
                    return samePackageCandidates[0];
                }
            }
        }
        // Fallback: try any unique candidate across all packages
        const candidates = this.simpleNameMap.get(typeName);
        if (candidates && candidates.size === 1) {
            return Array.from(candidates)[0];
        }
        // ambiguous or not found
        return null;
    }
    isRepositoryClassName(className) {
        return this.repositoryPatterns.some(pattern => className.endsWith(pattern));
    }
    isInfrastructureClassName(className) {
        return this.infrastructurePatterns.some(pattern => className.endsWith(pattern));
    }
    isRepositoryType(typeName) {
        // Strip generics and array brackets
        const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
        return this.isRepositoryClassName(raw);
    }
    isAnemicService(cls) {
        if (cls.classType !== 'class') {
            return false;
        }
        const concrete = cls.methods.filter(m => m.methodType !== 'abstract' && m.methodType !== 'native');
        // An empty (marker-only) service has no business logic by definition.
        if (concrete.length === 0) {
            return true;
        }
        // Require multiple methods before calling it anemic to avoid noise on thin 1-method pass-throughs.
        if (concrete.length < 2) {
            return false;
        }
        return concrete.every(m => this.isTrivialServiceMethod(m));
    }
    isTrivialServiceMethod(method) {
        if (this.isAccessor(method)) {
            return true;
        }
        if ((method.createdObjects || []).length > 0) {
            return false;
        }
        if ((method.calledMethods || []).length > 1) {
            return false;
        }
        const body = method.body;
        if (!body) {
            return true;
        }
        if (body.linesOfCode > 5) {
            return false;
        }
        if (body.localVariables.length > 3) {
            return false;
        }
        if (body.cyclomaticComplexity !== undefined && body.cyclomaticComplexity > 1) {
            return false;
        }
        if (body.businessLogicScore !== undefined && body.businessLogicScore > 0) {
            return false;
        }
        return true;
    }
    isAccessor(method) {
        const isGetter = method.name.startsWith('get') && method.name.length > 3 &&
            method.parameters.length === 0 && !method.returnType.startsWith('void');
        const isSetter = method.name.startsWith('set') && method.name.length > 3 &&
            method.parameters.length === 1 && method.returnType.startsWith('void');
        return isGetter || isSetter;
    }
}
exports.ServiceLayerAnalyzer = ServiceLayerAnalyzer;
//# sourceMappingURL=serviceLayerDetector.js.map