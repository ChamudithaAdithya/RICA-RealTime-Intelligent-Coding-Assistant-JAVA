"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerLayerAnalyzer = void 0;
class ControllerLayerAnalyzer {
    constructor() {
        // Map of fully qualified class name to its layer and class info
        this.classLayers = new Map();
        this.classMap = new Map();
        // Map of simple class name to possible fully qualified names (for ambiguous resolution)
        this.simpleNameMap = new Map();
        // Known service patterns
        this.servicePatterns = ['Service', 'Manager', 'Handler'];
        // Known repository patterns
        this.repositoryPatterns = ['Repository', 'Dao', 'DAO', 'Persistence', 'PersistenceImpl', 'RepositoryImpl'];
        // Known infrastructure patterns
        this.infrastructurePatterns = ['Client', 'Gateway', 'Connector', 'Producer', 'Consumer'];
        // Known business logic indicators in method bodies
        this.businessLogicPatterns = [
            'if\\s*\\(',
            'for\\s*\\(',
            'while\\s*\\(',
            'switch\\s*\\(',
            '\\|\\|',
            '&&',
            '==',
            '!=',
            '<',
            '>',
            '<=',
            '>=',
            '\\+\\+',
            '--',
            '\\+=',
            '-=',
            '\\*=',
            '/=',
            '%=',
            'new\\s+java\\.sql\\.',
            'EntityManager',
            'CriteriaQuery',
            'Query\\s*\\(',
            'prepareStatement',
            'executeQuery',
            'executeUpdate'
        ];
    }
    analyze(astOutputs) {
        const violations = [];
        // Build lookup maps from all classes
        this.buildClassMaps(astOutputs);
        // Analyze each controller class
        for (const ast of astOutputs) {
            for (const cls of ast.classes) {
                if (cls.detectedLayer !== 'controller') {
                    continue;
                }
                // Check field-level service/repository injection
                for (const field of cls.attributes) {
                    if (this.isServiceType(field.dataType) || this.isRepositoryType(field.dataType)) {
                        if (!field.isInjected) {
                            violations.push({
                                type: 'uninjected-service-access',
                                message: `Controller class '${cls.className}' has uninjected ${this.isServiceType(field.dataType) ? 'service' : 'repository'} field '${field.name}' of type ${field.dataType}. Annotate with @Autowired/@Inject/@Resource.`,
                                className: cls.fullyQualifiedName,
                                fieldName: field.name,
                                severity: 'error',
                                filePath: ast.filePath,
                                range: field.startLine ? {
                                    start: { line: field.startLine, character: field.startColumn || 0 },
                                    end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
                                } : undefined,
                                explanation: 'Your controller has a service or repository field that is not annotated for injection. The framework should wire this dependency automatically; otherwise you risk null references and lose the ability to easily swap or mock the dependency.'
                            });
                        }
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
                        // Check if target is a service, repository, or infrastructure
                        const targetInfo = this.classMap.get(targetFQCN);
                        const targetLayer = this.classLayers.get(targetFQCN);
                        const isServiceByLayer = targetLayer === 'service';
                        const isRepoByLayer = targetLayer === 'repository' || targetLayer === 'dao';
                        const isServiceByName = this.isServiceClassName(targetFQCN.split('.').pop() || '');
                        const isRepoByName = this.isRepositoryClassName(targetFQCN.split('.').pop() || '');
                        const isInfrastructure = this.isInfrastructureClassName(targetFQCN.split('.').pop() || '');
                        if ((isServiceByLayer || isServiceByName) || (isRepoByLayer || isRepoByName)) {
                            if (!call.receiverIsInjected) {
                                violations.push({
                                    type: 'uninjected-service-access',
                                    message: `Controller method '${method.name}' accesses ${isServiceByLayer || isServiceByName ? 'service' : 'repository'} '${targetFQCN}' via uninjected field/parameter. Use dependency injection.`,
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
                                    explanation: 'Your controller method accesses a service or repository through a field or parameter that was not injected by the DI container. Relying on injection keeps your controller focused on HTTP concerns and leaves object wiring to the framework.'
                                });
                            }
                        }
                        else if (isInfrastructure && !call.receiverIsInjected) {
                            // Infrastructure clients should also be injected
                            violations.push({
                                type: 'uninjected-service-access',
                                message: `Controller method '${method.name}' calls infrastructure class '${targetFQCN}' via uninjected field/parameter.`,
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
                                explanation: 'Your controller method calls an infrastructure component through an uninjected reference. Infrastructure dependencies should be provided by the container to keep your controller testable and free from manual object management.'
                            });
                        }
                    }
                    // Check object creations (self-instantiation)
                    for (const creation of method.createdObjects) {
                        const className = creation.className;
                        if (this.isServiceClassName(className) || this.isRepositoryClassName(className) || this.isInfrastructureClassName(className)) {
                            violations.push({
                                type: 'self-instantiation',
                                message: `Controller method '${method.name}' instantiates ${this.isServiceClassName(className) ? 'service' : this.isRepositoryClassName(className) ? 'repository' : 'infrastructure'} class '${className}' directly. Use dependency injection.`,
                                className: cls.fullyQualifiedName,
                                methodName: method.name,
                                lineNumber: creation.lineNumber,
                                range: creation.lineNumber ? {
                                    start: { line: creation.lineNumber, character: 0 },
                                    end: { line: creation.lineNumber, character: 80 },
                                } : undefined,
                                severity: 'error',
                                filePath: ast.filePath,
                                explanation: 'Your controller method directly constructs a service, repository, or infrastructure class instead of receiving it through dependency injection. This couples your controller to a specific concrete type and lifecycle, making it harder to unit test and maintain.'
                            });
                        }
                    }
                    // Check for business logic in controller methods
                    const businessLogicScore = this.calculateBusinessLogicScore(method);
                    if (businessLogicScore > 3) { // Threshold for significant business logic
                        violations.push({
                            type: 'business-logic',
                            message: `Controller method '${method.name}' contains significant business logic (score: ${businessLogicScore}). Consider moving logic to service layer.`,
                            className: cls.fullyQualifiedName,
                            methodName: method.name,
                            lineNumber: method.body?.linesOfCode,
                            range: method.startLine ? {
                                start: { line: method.startLine, character: method.startColumn || 0 },
                                end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                            } : undefined,
                            severity: 'warning',
                            filePath: ast.filePath,
                            explanation: 'Your controller method appears to contain significant business logic — things like conditionals, loops, or data manipulation — that belongs in the service layer. Controllers should only orchestrate HTTP concerns (parsing input, calling services, formatting responses); moving logic to a service keeps responsibilities clear and makes the logic reusable.'
                        });
                    }
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
    isServiceClassName(className) {
        return this.servicePatterns.some(pattern => className.endsWith(pattern));
    }
    isRepositoryClassName(className) {
        return this.repositoryPatterns.some(pattern => className.endsWith(pattern));
    }
    isInfrastructureClassName(className) {
        return this.infrastructurePatterns.some(pattern => className.endsWith(pattern));
    }
    isServiceType(typeName) {
        // Strip generics and array brackets
        const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
        return this.isServiceClassName(raw);
    }
    isRepositoryType(typeName) {
        // Strip generics and array brackets
        const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
        return this.isRepositoryClassName(raw);
    }
    calculateBusinessLogicScore(method) {
        let score = 0;
        const methodBody = method.body;
        if (!methodBody)
            return score;
        // We don't have direct access to method body text in the current AST structure
        // In a real implementation, we would analyze the actual method body
        // For now, we'll use a heuristic based on complexity indicators
        // Check method complexity based on available metrics
        if (methodBody.linesOfCode > 20) {
            score += 2; // Long methods often contain business logic
        }
        if (methodBody.localVariables.length > 5) {
            score += 1; // Many local variables suggest complex logic
        }
        // Since we don't have the actual method body text, we'll return a basic score
        // In a full implementation, we would parse the method body for business logic patterns
        return score;
    }
}
exports.ControllerLayerAnalyzer = ControllerLayerAnalyzer;
//# sourceMappingURL=controllerLayerDetector.js.map