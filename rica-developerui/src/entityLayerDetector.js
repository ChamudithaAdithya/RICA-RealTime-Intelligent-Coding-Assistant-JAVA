"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityLayerAnalyzer = void 0;
class EntityLayerAnalyzer {
    constructor() {
        // Map of fully qualified class name to its layer and class info
        this.classLayers = new Map();
        this.classMap = new Map();
        // Map of simple class name to possible fully qualified names (for ambiguous resolution)
        this.simpleNameMap = new Map();
        // Known entity patterns
        this.entityPatterns = ['Entity'];
        // Known repository patterns (to detect improper access)
        this.repositoryPatterns = ['Repository', 'Dao', 'DAO', 'Persistence', 'PersistenceImpl', 'RepositoryImpl'];
        // Known service patterns (to detect improper access)
        this.servicePatterns = ['Service', 'Manager', 'Handler'];
        // Known infrastructure patterns (to detect improper access)
        this.infrastructurePatterns = ['Client', 'Gateway', 'Connector', 'Producer', 'Consumer'];
        // SQL/JDBC/JPA types — entities must not perform data access directly
        this.rawSQLPatterns = [
            'DataSource', 'Connection', 'Statement', 'PreparedStatement',
            'CallableStatement', 'ResultSet', 'RowSet', 'JdbcTemplate',
            'NamedParameterJdbcTemplate', 'SimpleJdbcInsert', 'SimpleJdbcCall',
            'EntityManager', 'Session', 'SessionFactory', 'HibernateTemplate',
            'SqlSession', 'SqlSessionFactory', 'DatabaseClient',
            'R2dbcEntityTemplate', 'R2dbcDatabaseClient', 'DriverManager'
        ];
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
        // Analyze each entity class
        for (const ast of astOutputs) {
            for (const cls of ast.classes) {
                if (cls.detectedLayer !== 'entity') {
                    continue;
                }
                // Check field-level improper dependencies
                for (const field of cls.attributes) {
                    if (this.isImproperDependency(field.dataType)) {
                        violations.push({
                            type: 'direct-layer-access',
                            message: `Entity class '${cls.className}' has improper dependency on ${this.getDependencyType(field.dataType)} field '${field.name}' of type ${field.dataType}. Entities should not directly depend on services, repositories, or infrastructure.`,
                            className: cls.fullyQualifiedName,
                            fieldName: field.name,
                            severity: 'error',
                            filePath: ast.filePath,
                            range: field.startLine ? {
                                start: { line: field.startLine, character: field.startColumn || 0 },
                                end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
                            } : undefined,
                            explanation: 'Your entity class directly depends on a service, repository, or infrastructure component through a field. Entities are meant to be plain data containers or rich domain objects; referencing upper-layer classes violates layered architecture and introduces coupling that makes entities harder to persist and test in isolation.'
                        });
                    }
                    if (this.isRawSQLType(field.dataType)) {
                        violations.push({
                            type: 'improper-data-access',
                            message: `Entity class '${cls.className}' has direct data access field '${field.name}' of type ${field.dataType}. Move data access to a repository, not the entity.`,
                            className: cls.fullyQualifiedName,
                            fieldName: field.name,
                            severity: 'error',
                            filePath: ast.filePath,
                            range: field.startLine ? {
                                start: { line: field.startLine, character: field.startColumn || 0 },
                                end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
                            } : undefined,
                            explanation: 'Your entity class holds a database access object (JDBC/JPA/Datasource) as a field. Entities must not manage persistence themselves — all data access belongs in a repository so entities stay portable and independent of the storage technology.'
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
                        // Check if target is an improper dependency (service, repository, infrastructure)
                        const targetInfo = this.classMap.get(targetFQCN);
                        const targetLayer = this.classLayers.get(targetFQCN);
                        const isServiceByLayer = targetLayer === 'service';
                        const isRepoByLayer = targetLayer === 'repository' || targetLayer === 'dao';
                        const isInfrastructureByLayer = targetLayer === 'infrastructure' || targetLayer === 'utility';
                        const isServiceByName = this.isServiceClassName(targetFQCN.split('.').pop() || '');
                        const isRepoByName = this.isRepositoryClassName(targetFQCN.split('.').pop() || '');
                        const isInfrastructureByName = this.isInfrastructureClassName(targetFQCN.split('.').pop() || '');
                        if ((isServiceByLayer || isServiceByName) ||
                            (isRepoByLayer || isRepoByName) ||
                            (isInfrastructureByLayer || isInfrastructureByName)) {
                            if (!call.receiverIsInjected) {
                                violations.push({
                                    type: 'direct-layer-access',
                                    message: `Entity method '${method.name}' accesses improper dependency '${targetFQCN}' via uninjected field/parameter. Entities should not directly call services, repositories, or infrastructure.`,
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
                                    explanation: 'Your entity method calls a service, repository, or infrastructure component directly. Entities should not reach into other layers — any cross-layer calls belong in services that coordinate domain objects.'
                                });
                            }
                        }
                    }
                    // Check object creations (self-instantiation of improper dependencies)
                    for (const creation of method.createdObjects) {
                        const className = creation.className;
                        if (this.isImproperDependency(className)) {
                            violations.push({
                                type: 'direct-layer-access',
                                message: `Entity method '${method.name}' instantiates ${this.getDependencyType(className)} class '${className}' directly. Entities should not directly instantiate services, repositories, or infrastructure.`,
                                className: cls.fullyQualifiedName,
                                methodName: method.name,
                                lineNumber: creation.lineNumber,
                                range: creation.lineNumber ? {
                                    start: { line: creation.lineNumber, character: 0 },
                                    end: { line: creation.lineNumber, character: 80 },
                                } : undefined,
                                severity: 'error',
                                filePath: ast.filePath,
                                explanation: 'Your entity method directly instantiates a service, repository, or infrastructure class. Entities should not control the lifecycle of upper-layer components; let the service layer handle those interactions.'
                            });
                        }
                    }
                    // Check improper data access — entities must not use DB/JDBC/JPA APIs directly
                    const rawSqlCall = method.calledMethods.find(call => this.isRawSQLType(call.receiverType || '') || this.isRawSQLType(call.targetClass || ''));
                    if (rawSqlCall) {
                        const rawSqlType = rawSqlCall.receiverType || rawSqlCall.targetClass || '';
                        violations.push({
                            type: 'improper-data-access',
                            message: `Entity method '${method.name}' accesses the database directly via '${rawSqlType}'. Move data access to a repository, not the entity.`,
                            className: cls.fullyQualifiedName,
                            methodName: method.name,
                            receiverVariable: rawSqlCall.receiverVariableName,
                            lineNumber: rawSqlCall.lineNumber,
                            range: rawSqlCall.lineNumber ? {
                                start: { line: rawSqlCall.lineNumber, character: rawSqlCall.column || 0 },
                                end: { line: rawSqlCall.lineNumber, character: (rawSqlCall.column || 0) + (rawSqlCall.calledMethodName?.length || 8) },
                            } : undefined,
                            severity: 'error',
                            filePath: ast.filePath,
                            explanation: 'Your entity method performs a direct database operation (JDBC, JdbcTemplate, EntityManager, etc.). Entities must not talk to the persistence layer — put data access in a repository so the entity never depends on storage specifics and can be reused across data sources.'
                        });
                    }
                    const rawSqlCreation = method.createdObjects.find(creation => this.isRawSQLType(creation.className));
                    if (rawSqlCreation) {
                        violations.push({
                            type: 'improper-data-access',
                            message: `Entity method '${method.name}' directly creates data access object '${rawSqlCreation.className}'. Move this to a repository, not the entity.`,
                            className: cls.fullyQualifiedName,
                            methodName: method.name,
                            lineNumber: rawSqlCreation.lineNumber,
                            range: rawSqlCreation.lineNumber ? {
                                start: { line: rawSqlCreation.lineNumber, character: 0 },
                                end: { line: rawSqlCreation.lineNumber, character: 80 },
                            } : undefined,
                            severity: 'error',
                            filePath: ast.filePath,
                            explanation: 'Your entity method directly instantiates a database access object (JDBC/JPA/Datasource). Constructing persistence objects inside an entity couples it to the storage layer — create a repository instead and let the service layer coordinate data access.'
                        });
                    }
                    // Check for business logic in entity methods
                    const businessLogicScore = this.calculateBusinessLogicScore(method);
                    if (businessLogicScore > 2) { // Lower threshold for entities as they should have minimal logic
                        violations.push({
                            type: 'business-logic',
                            message: `Entity method '${method.name}' contains significant business logic (score: ${businessLogicScore}). Consider moving logic to service layer or keeping entities as simple data containers.`,
                            className: cls.fullyQualifiedName,
                            methodName: method.name,
                            lineNumber: method.body?.linesOfCode,
                            range: method.startLine ? {
                                start: { line: method.startLine, character: method.startColumn || 0 },
                                end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                            } : undefined,
                            severity: 'warning',
                            filePath: ast.filePath,
                            explanation: 'Your entity method contains logic that goes beyond simple data validation or derived properties. Entities can hold behavior, but complex business rules, data manipulation, or flow control usually belongs in domain services to keep entities focused and maintainable.'
                        });
                    }
                }
                // Check for anemic entity (once per class, not per method)
                const isAnemic = cls.methods.length > 0 && this.isAnemicEntity(cls);
                if (isAnemic) {
                    violations.push({
                        type: 'anemic-entity',
                        message: `Entity class '${cls.className}' appears to be anemic (primarily getters/setters only). Consider whether this entity should contain more behavior.`,
                        className: cls.fullyQualifiedName,
                        severity: 'info',
                        filePath: ast.filePath,
                        range: cls.startLine ? {
                            start: { line: cls.startLine, character: cls.startColumn || 0 },
                            end: { line: cls.endLine || cls.startLine, character: cls.endColumn || (cls.startColumn || 0) + 1 },
                        } : undefined,
                        explanation: 'Your entity class is mostly getters and setters with little to no behavior. In some designs this is fine (simple data holders), but in domain-driven designs you may want to move relevant behavior into the entity itself — ask yourself whether this class captures the full contract of the domain concept it represents.'
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
    isImproperDependency(typeName) {
        // Strip generics and array brackets
        const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
        return this.isServiceClassName(raw) || this.isRepositoryClassName(raw) || this.isInfrastructureClassName(raw);
    }
    getDependencyType(typeName) {
        // Strip generics and array brackets
        const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
        if (this.isServiceClassName(raw))
            return 'service';
        if (this.isRepositoryClassName(raw))
            return 'repository';
        if (this.isInfrastructureClassName(raw))
            return 'infrastructure';
        return 'unknown';
    }
    isServiceClassName(className) {
        return this.servicePatterns.some(pattern => className.endsWith(pattern));
    }
    isRepositoryClassName(className) {
        return this.repositoryPatterns.some(pattern => className.endsWith(pattern));
    }
    isRawSQLType(typeName) {
        // Strip generics and array brackets
        const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
        return this.rawSQLPatterns.some(p => raw === p || raw.endsWith('.' + p));
    }
    isInfrastructureClassName(className) {
        return this.infrastructurePatterns.some(pattern => className.endsWith(pattern));
    }
    isEntityClassName(className) {
        return this.entityPatterns.some(pattern => className.endsWith(pattern));
    }
    calculateBusinessLogicScore(method) {
        let score = 0;
        const methodBody = method.body;
        if (!methodBody)
            return score;
        // Check method complexity based on available metrics
        if (methodBody.linesOfCode > 10) {
            score += 2; // Long methods in entities often contain business logic
        }
        if (methodBody.localVariables.length > 3) {
            score += 1; // Many local variables suggest complex logic
        }
        // Since we don't have the actual method body text, we'll return a basic score
        // In a full implementation, we would parse the method body for business logic patterns
        return score;
    }
    isAnemicEntity(cls) {
        const totalMethods = cls.methods.length;
        if (totalMethods === 0)
            return false;
        let getterSetterCount = 0;
        for (const method of cls.methods) {
            // Check if method looks like a getter or setter
            const isGetter = method.name.startsWith('get') && method.name.length > 3 &&
                method.parameters.length === 0 && !method.returnType.startsWith('void');
            const isSetter = method.name.startsWith('set') && method.name.length > 3 &&
                method.parameters.length === 1 && method.returnType.startsWith('void');
            if (isGetter || isSetter) {
                getterSetterCount++;
            }
        }
        // If more than 80% of methods are getters/setters, consider it anemic
        return (getterSetterCount / totalMethods) > 0.8;
    }
}
exports.EntityLayerAnalyzer = EntityLayerAnalyzer;
//# sourceMappingURL=entityLayerDetector.js.map