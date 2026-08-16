import { FullASTOutput, ClassInfo, Method, MethodCall, ObjectCreation, ImportInfo } from './astTypes';
import { DiagnosticRange } from './types/violations';

export interface APIResourceLayerViolation {
  type: 'exposing-internal-entity' | 'missing-dto-usage' | 'improper-error-handling' | 'business-logic-in-resource' | 'direct-service-instantiation' | 'missing-validation' | 'exposing-internal-structure';
  message: string;
  className: string;
  methodName?: string;
  fieldName?: string;
  receiverVariable?: string;
  lineNumber?: number;
  range?: DiagnosticRange;
  severity: 'error' | 'warning' | 'info';
  filePath?: string; // originating file
  explanation?: string;
}

export class APIResourceLayerAnalyzer {
  private businessLogicThreshold = 3;

  // Map of fully qualified class name to its layer and class info
  private classLayers: Map<string, string> = new Map();
  private classMap: Map<string, ClassInfo> = new Map();
  // Map of simple class name to possible fully qualified names (for ambiguous resolution)
  private simpleNameMap: Map<string, Set<string>> = new Map();
  // Known service patterns
  private servicePatterns = ['Service', 'Manager', 'Handler'];
  // Known repository patterns
  private repositoryPatterns = ['Repository', 'Dao', 'DAO', 'Persistence', 'PersistenceImpl', 'RepositoryImpl'];
  // Known entity patterns
  private entityPatterns = ['Entity'];
  // Known DTO patterns
  private dtoPatterns = ['DTO', 'Request', 'Response', 'VO'];
  // Known infrastructure patterns
  private infrastructurePatterns = ['Client', 'Gateway', 'Connector', 'Producer', 'Consumer'];
  // Primitive/wrapper/JDK types — never internal domain types
  private simpleTypes = new Set([
    'int', 'long', 'short', 'byte', 'char', 'boolean', 'float', 'double',
    'Integer', 'Long', 'Short', 'Byte', 'Character', 'Boolean', 'Float', 'Double',
    'String', 'BigDecimal', 'BigInteger', 'LocalDate', 'LocalTime', 'LocalDateTime',
    'Instant', 'Date', 'Duration', 'Period', 'UUID', 'Object', 'Void', 'void',
    'List', 'Set', 'Map', 'Collection', 'Optional', 'Iterable'
  ]);
  // Known exception patterns
  private exceptionPatterns = ['Exception', 'Error'];
  // Known validation annotations
  private validationAnnotations = ['Valid', 'NotNull', 'Size', 'Min', 'Max', 'Pattern', 'Email', 'NotEmpty', 'NotBlank'];

  setBusinessLogicThreshold(value: number): void {
    this.businessLogicThreshold = value;
  }

  analyze(astOutputs: FullASTOutput[]): APIResourceLayerViolation[] {
    const violations: APIResourceLayerViolation[] = [];

    // Build lookup maps from all classes
    this.buildClassMaps(astOutputs);

    // Analyze each API/resource class (identified by @RestController or similar)
    for (const ast of astOutputs) {
      for (const cls of ast.classes) {
        // Check if this is an API/resource class
        if (!this.isApiResourceClass(cls)) {
          continue;
        }

        // Check field-level service injection
        for (const field of cls.attributes) {
          if (this.isServiceType(field.dataType) && !field.isInjected) {
            violations.push({
              type: 'direct-service-instantiation',
              message: `API resource class '${cls.className}' has uninjected service field '${field.name}' of type ${field.dataType}. Annotate with @Autowired/@Inject/@Resource.`,
              className: cls.fullyQualifiedName,
              fieldName: field.name,
              severity: 'error',
              filePath: ast.filePath,
              range: field.startLine ? {
                start: { line: field.startLine, character: field.startColumn || 0 },
                end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
              } : undefined,
              explanation: 'Your API resource class has a service field that is not injected. Resources should receive service dependencies through the DI container so they remain focused on HTTP concerns and can be tested without bootstrapping the full application.'
            });
          }
        }

        // Analyze each method
        for (const method of cls.methods) {
          if (method.methodType === 'abstract') continue;
          const isEndpoint = method.accessModifier !== 'private';

          // Check method calls
          for (const call of method.calledMethods) {
            if (!call.targetClass) continue;

            // Resolve target class FQCN if needed
            const targetFQCN = this.resolveTypeName(call.targetClass, ast.imports, ast.packageInfo?.name);
            if (!targetFQCN) continue;

            // Check if target is a service, repository, or infrastructure
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
                  type: 'direct-service-instantiation',
                  message: `API resource method '${method.name}' accesses ${this.getDependencyType(targetFQCN)} '${targetFQCN}' via uninjected field/parameter. Use dependency injection.`,
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
                  explanation: 'Your API resource method accesses a service, repository, or infrastructure component through an uninjected reference. Let the container supply these dependencies so your resource stays testable and decoupled.'
                });
              }
            }
          }

          // Check object creations (self-instantiation of services/repositories)
          for (const creation of method.createdObjects) {
            const className = creation.className;
            if (this.isServiceClassName(className) || this.isRepositoryClassName(className) || this.isInfrastructureClassName(className)) {
              violations.push({
                  type: 'direct-service-instantiation',
                  message: `API resource method '${method.name}' instantiates ${this.getDependencyType(className)} class '${className}' directly. Use dependency injection.`,
                  className: cls.fullyQualifiedName,
                  methodName: method.name,
                  lineNumber: creation.lineNumber,
                  range: creation.lineNumber ? {
                    start: { line: creation.lineNumber, character: 0 },
                    end: { line: creation.lineNumber, character: 80 },
                  } : undefined,
                  severity: 'error',
                  filePath: ast.filePath,
                  explanation: 'Your API resource method directly creates a service, repository, or infrastructure class with "new". This bypasses the DI container entirely, making the dependency hard-coded and preventing you from mocking it in integration or unit tests.'
                });
            }
          }

          // Check for business logic in API resource methods
          const businessLogicScore = method.body?.businessLogicScore ?? 0;
          if (businessLogicScore >= this.businessLogicThreshold) { // Threshold for significant business logic
            violations.push({
              type: 'business-logic-in-resource',
              message: `API resource method '${method.name}' contains significant business logic (score: ${businessLogicScore}). Consider moving logic to service layer.`,
              className: cls.fullyQualifiedName,
              methodName: method.name,
              lineNumber: method.body?.linesOfCode,
              range: method.startLine ? {
                start: { line: method.startLine, character: method.startColumn || 0 },
                end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
              } : undefined,
              severity: 'warning',
              filePath: ast.filePath,
              explanation: 'Your API resource method contains business logic that should live in the service layer. API resources should delegate to services and focus on request/response handling; pushing logic down keeps resources thin, testable, and aligned with the single-responsibility principle.'
            });
          }

          // Check for exposing internal entities in return types
          if (isEndpoint) {
            const exposesInternalEntity = this.checkForExposingInternalEntity(method);
            if (exposesInternalEntity) {
              violations.push({
                type: 'exposing-internal-entity',
                message: `API resource method '${method.name}' returns internal entity type '${exposesInternalEntity}'. Consider using DTOs for API responses to encapsulate internal structure.`,
                className: cls.fullyQualifiedName,
                methodName: method.name,
                lineNumber: method.body?.linesOfCode,
                range: method.startLine ? {
                  start: { line: method.startLine, character: method.startColumn || 0 },
                  end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                } : undefined,
                severity: 'warning',
                filePath: ast.filePath,
                explanation: 'Your API resource method returns an internal entity type directly in its response. This leaks your persistence/domain model to external consumers — use Data Transfer Objects (DTOs) to decouple your internal schema from your API contract so changes to entities do not break clients.'
              });
            }
          }

          // V202: missing DTO usage — endpoint consumes internal domain types instead of DTOs
          if (isEndpoint) {
            const domParam = method.parameters.find(param =>
              this.isInternalDomainType(this.unwrapContainer(param.dataType), ast.imports, ast.packageInfo?.name)
            );
            if (domParam) {
              violations.push({
                type: 'missing-dto-usage',
                message: `API resource method '${method.name}' uses internal domain type '${domParam.dataType}' for parameter '${domParam.name}' instead of a DTO.`,
                className: cls.fullyQualifiedName,
                methodName: method.name,
                lineNumber: method.body?.linesOfCode,
                range: method.startLine ? {
                  start: { line: method.startLine, character: method.startColumn || 0 },
                  end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                } : undefined,
                severity: 'warning',
                filePath: ast.filePath,
                explanation: 'Your API method accepts an internal domain object as a parameter instead of a DTO. Input payloads should be validated DTOs so the API contract stays decoupled from your internal model — change the parameter to a request DTO and map it to the domain object in the service layer.'
              });
            }

            // V207: exposing internal structure — endpoint returns internal domain objects instead of DTOs
            const returnType = this.unwrapContainer(method.returnType);
            if (returnType && !this.isEntityClassName(this.stripGenerics(returnType)) &&
                this.isInternalDomainType(returnType, ast.imports, ast.packageInfo?.name)) {
              violations.push({
                type: 'exposing-internal-structure',
                message: `API resource method '${method.name}' returns internal domain type '${method.returnType}'. Use a DTO for the response contract.`,
                className: cls.fullyQualifiedName,
                methodName: method.name,
                lineNumber: method.body?.linesOfCode,
                range: method.startLine ? {
                  start: { line: method.startLine, character: method.startColumn || 0 },
                  end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                } : undefined,
                severity: 'warning',
                filePath: ast.filePath,
                explanation: 'Your API method returns an internal domain object instead of a DTO. Returning domain/persistence objects in responses leaks internal structure into the API contract — introduce a response DTO and map the domain object to it before returning, so internal changes do not break external clients.'
              });
            }
          }

          // Check for missing validation on parameters (private helper methods are not endpoints)
          if (isEndpoint) {
            const missingValidation = this.checkForMissingValidation(method);
            if (missingValidation) {
              violations.push({
                type: 'missing-validation',
                message: `API resource method '${method.name}' parameter '${missingValidation}' lacks validation annotations. Consider adding @Valid, @NotNull, etc. for input validation.`,
                className: cls.fullyQualifiedName,
                methodName: method.name,
                lineNumber: method.body?.linesOfCode,
                range: method.startLine ? {
                  start: { line: method.startLine, character: method.startColumn || 0 },
                  end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                } : undefined,
                severity: 'info',
                filePath: ast.filePath,
                explanation: 'Your API resource method has a parameter that lacks validation annotations. Adding constraints like @Valid, @NotNull, or @Size ensures malformed input is caught early and produces clean error responses instead of cryptic failures deeper in the stack.'
              });
            }
          }

          // Check for improper error handling (exposing exceptions) — only for endpoint methods
          if (isEndpoint) {
            const improperErrorHandling = this.checkForImproperErrorHandling(method);
            if (improperErrorHandling) {
              violations.push({
                type: 'improper-error-handling',
                message: `API resource method '${method.name}' exposes internal exceptions or stack traces. Use proper exception handling and return appropriate error responses.`,
                className: cls.fullyQualifiedName,
                methodName: method.name,
                lineNumber: method.body?.linesOfCode,
                range: method.startLine ? {
                  start: { line: method.startLine, character: method.startColumn || 0 },
                  end: { line: method.endLine || method.startLine, character: method.endColumn || (method.startColumn || 0) + 1 },
                } : undefined,
                severity: 'warning',
                filePath: ast.filePath,
                explanation: 'Your API resource method exposes internal exceptions or stack traces. Catch exceptions at the boundary and translate them into meaningful HTTP error responses so internal implementation details do not leak to clients and users get actionable error information.'
              });
            }
          }
        }
      }
    }

    return violations;
  }

  private buildClassMaps(astOutputs: FullASTOutput[]): void {
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
        this.simpleNameMap.get(simple)!.add(fqcn);
      }
    }
  }

  private resolveTypeName(typeName: string, imports: ImportInfo[], currentPackage?: string): string | null {
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

  private isApiResourceClass(cls: ClassInfo): boolean {
    // Check for common API/resource annotations
    const apiAnnotations = ['RestController', 'Controller', 'Resource', 'Endpoint'];
    return apiAnnotations.some(annotation =>
      cls.annotations.some(ann => ann.name.endsWith(annotation))
    );
  }

  private isServiceClassName(className: string): boolean {
    return this.servicePatterns.some(pattern => className.endsWith(pattern));
  }

  private isRepositoryClassName(className: string): boolean {
    return this.repositoryPatterns.some(pattern => className.endsWith(pattern));
  }

  private isInfrastructureClassName(className: string): boolean {
    return this.infrastructurePatterns.some(pattern => className.endsWith(pattern));
  }

  private isEntityClassName(className: string): boolean {
    return this.entityPatterns.some(pattern => className.endsWith(pattern));
  }

  private isDTOClassName(className: string): boolean {
    return this.dtoPatterns.some(pattern => className.endsWith(pattern));
  }

  private isServiceType(typeName: string): boolean {
    // Strip generics and array brackets
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.isServiceClassName(raw);
  }

  private isRepositoryType(typeName: string): boolean {
    // Strip generics and array brackets
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.isRepositoryClassName(raw);
  }

  private getDependencyType(className: string): string {
    // Strip generics and array brackets
    const raw = className.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    if (this.isServiceClassName(raw)) return 'service';
    if (this.isRepositoryClassName(raw)) return 'repository';
    if (this.isInfrastructureClassName(raw)) return 'infrastructure';
    return 'unknown';
  }

  private checkForExposingInternalEntity(method: Method): string | null {
    // Check return type for internal entities
    const returnType = method.returnType;
    if (returnType && this.isEntityClassName(returnType)) {
      return returnType;
    }

    // Check for collection/array of entities
    if (returnType && (returnType.startsWith('List<') || returnType.startsWith('Set<') || returnType.endsWith('[]'))) {
      // Extract generic type
      const genericMatch = returnType.match(/<(.+)>/);
      if (genericMatch && genericMatch[1]) {
        const genericType = genericMatch[1];
        if (this.isEntityClassName(genericType)) {
          return `List<${genericType}>`;
        }
      }
    }

    return null;
  }

  private checkForMissingValidation(method: Method): string | null {
    // Check method parameters for missing validation
    for (const param of method.parameters) {
      // Skip if it's a simple type that might not need validation (though this is debatable)
      const isSimpleType = ['int', 'long', 'boolean', 'double', 'float', 'short', 'byte', 'char', 'String'].includes(param.dataType);

      // Check if parameter has validation annotations
      const hasValidation = param.annotations.some(ann =>
        this.validationAnnotations.some(v => ann.name.endsWith(v))
      );

      // Flag non-simple types without validation (or all types for strict validation)
      if (!isSimpleType && !hasValidation) {
        return param.name;
      }

      // Even for simple types, ID parameters often should be validated (positive, etc.)
      if (param.name.toLowerCase().includes('id') && !hasValidation) {
        return param.name;
      }
    }

    return null;
  }

  private checkForImproperErrorHandling(method: Method): boolean {
    // (a) Endpoint throws a raw generic exception that the framework would surface
    //     as a bare 500 — internal details leak to clients.
    const rawThrows = (method.throwsExceptions || []).some(ex => {
      const raw = this.stripGenerics(ex);
      if (['Exception', 'RuntimeException', 'Throwable', 'IOException', 'SQLException', 'Error'].includes(raw)) {
        return true;
      }
      return this.isStandardLibraryType(raw) && /\.(Exception|Error)$/.test(raw);
    });
    if (rawThrows) return true;

    // (b) Endpoint constructs a raw generic exception (e.g. `throw new Exception(...)`).
    const rawCreated = (method.createdObjects || []).some(o =>
      ['Exception', 'RuntimeException', 'Throwable', 'IOException', 'SQLException', 'Error'].includes(o.className)
    );
    if (rawCreated) return true;

    // (c) Endpoint leaks stack traces to the client via printStackTrace().
    if ((method.calledMethods || []).some(call => call.calledMethodName === 'printStackTrace')) return true;

    return false;
  }

  // V202/V207 helpers
  private unwrapContainer(typeName: string): string {
    if (!typeName) return '';
    let raw = typeName.trim().replace(/\s*\[\]\s*$/g, '');
    const m = raw.match(/^[A-Za-z_$][\w$]*(?:<(.+)>)$/);
    if (m && m[1]) {
      const args = m[1].split(',').map(s => s.trim());
      return args[0] || raw;
    }
    return raw;
  }

  private stripGenerics(typeName: string): string {
    if (!typeName) return '';
    return typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
  }

  private isStandardLibraryType(typeName: string): boolean {
    return /^(java\.|javax\.|jakarta\.|org\.springframework\.|org\.apache\.|com\.sun\.|com\.fasterxml\.|lombok\.|org\.hibernate\.)/.test(typeName);
  }

  private isSimpleType(typeName: string): boolean {
    return this.simpleTypes.has(typeName);
  }

  private isInternalDomainType(typeName: string, imports: ImportInfo[], currentPackage?: string): boolean {
    if (!typeName) return false;
    const raw = this.stripGenerics(typeName);
    if (this.isSimpleType(raw)) return false;
    if (this.isDTOClassName(raw)) return false;
    if (this.isStandardLibraryType(raw)) return false;

    const fqcn = this.resolveTypeName(raw, imports, currentPackage);
    if (fqcn) {
      if (this.isStandardLibraryType(fqcn)) return false;
      if (this.classMap.has(fqcn)) return true;
      return this.isEntityClassName(raw);
    }
    // Unresolvable type — only rely on entity naming so unparsed framework or
    // third-party types are not falsely flagged.
    return this.isEntityClassName(raw);
  }
}