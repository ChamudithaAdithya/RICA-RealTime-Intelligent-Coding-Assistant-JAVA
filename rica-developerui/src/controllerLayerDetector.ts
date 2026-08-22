import { FullASTOutput, ClassInfo, MethodCall, ObjectCreation, ImportInfo } from './astTypes';
import { DiagnosticRange } from './types/violations';

export interface ControllerLayerViolation {
  type: 'self-instantiation' | 'uninjected-service-access' | 'business-logic'
      | 'direct-http-call' | 'file-io' | 'background-thread' | 'static-cache' | 'raw-sql-access';
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

export class ControllerLayerAnalyzer {
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
  // Known infrastructure patterns
  private infrastructurePatterns = ['Client', 'Gateway', 'Connector', 'Producer', 'Consumer'];
  // HTTP client types — controllers should delegate HTTP calls to gateway services
  private httpClientPatterns = [
    'HttpClient', 'RestTemplate', 'WebClient', 'OkHttpClient', 'RestClient',
    'HttpURLConnection', 'URLConnection', 'CloseableHttpClient',
    'HttpClients', 'HttpResponse', 'HttpRequest', 'HttpPost', 'HttpGet',
    'HttpPut', 'HttpDelete', 'HttpPatch', 'HttpEntity', 'HttpHeaders'
  ];
  // File I/O types — controllers should not read/write files
  private fileIOPatterns = [
    'File', 'FileInputStream', 'FileOutputStream', 'FileReader', 'FileWriter',
    'RandomAccessFile', 'BufferedReader', 'BufferedWriter', 'InputStreamReader',
    'OutputStreamWriter', 'FileChannel', 'FileLock', 'FilePermission',
    'Files', 'Paths', 'Path', 'FileSystem', 'FileStore', 'FileVisitOption',
    'SimpleFileVisitor', 'FileVisitor', 'DirectoryStream', 'FileFilter',
    'FilenameFilter', 'FileAttribute', 'BasicFileAttributes'
  ];
  // Thread / async patterns — controllers should not manage threads directly
  private threadPatterns = [
    'Thread', 'Runnable', 'Callable', 'Future', 'FutureTask',
    'ExecutorService', 'Executor', 'Executors', 'ThreadPoolExecutor',
    'ScheduledExecutorService', 'ScheduledThreadPoolExecutor',
    'CompletableFuture', 'CompletionService', 'ExecutorCompletionService',
    'Timer', 'TimerTask', 'Task', 'TaskScheduler', 'ThreadFactory'
  ];
  // Cache types for static fields — controllers should not hold static cache state
  private cacheTypePatterns = [
    'Cache', 'CacheManager', 'ConcurrentMapCache', 'CacheBuilder',
    'LoadingCache', 'CacheLoader', 'Caffeine', 'Ehcache', 'RedisCacheManager'
  ];
  // SQL/JDBC types — controllers should not access databases directly
  private rawSQLPatterns = [
    'DataSource', 'Connection', 'Statement', 'PreparedStatement',
    'CallableStatement', 'ResultSet', 'RowSet', 'JdbcTemplate',
    'NamedParameterJdbcTemplate', 'SimpleJdbcInsert', 'SimpleJdbcCall',
    'EntityManager', 'Session', 'SessionFactory', 'HibernateTemplate',
    'SqlSession', 'SqlSessionFactory', 'DatabaseClient',
    'R2dbcEntityTemplate', 'R2dbcDatabaseClient',
    'DriverManager'
  ];

  setBusinessLogicThreshold(value: number): void {
    this.businessLogicThreshold = value;
  }

  analyze(astOutputs: FullASTOutput[]): ControllerLayerViolation[] {
    const violations: ControllerLayerViolation[] = [];

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
          if (method.methodType === 'abstract') continue;

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
            const isServiceByName = this.isServiceClassName(targetFQCN.split('.').pop() || '');
            const isRepoByName = this.isRepositoryClassName(targetFQCN.split('.').pop() || '');
            const isInfrastructure = this.isInfrastructureClassName(targetFQCN.split('.').pop() || '');

            // Skip standard library types (they look like services via suffix matching but aren't)
            const isStandardLib = /^(java\.|javax\.|jakarta\.|com\.sun\.|org\.apache\.|org\.springframework\.)/.test(targetFQCN);

            if (!isStandardLib && ((isServiceByLayer || isServiceByName) || (isRepoByLayer || isRepoByName))) {
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
            } else if (!isStandardLib && isInfrastructure && !call.receiverIsInjected) {
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

            // Architectural violation checks for controller-unsafe types
            const simpleName = call.targetClass || call.receiverType || '';
            if (this.isHttpClientType(simpleName)) {
              violations.push({
                type: 'direct-http-call',
                message: `Controller method '${method.name}' makes an HTTP call via '${call.receiverVariableName || simpleName}' (${simpleName}). Delegate HTTP communication to a dedicated gateway service.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                severity: 'error', filePath: ast.filePath,
                explanation: 'Your controller should not directly call HTTP endpoints. Move HTTP client logic into a service or gateway class that your controller injects.'
              });
            }
            if (this.isFileIOType(simpleName)) {
              // Allowlist: thin wrappers for content-type sniffing or path resolution are legit in controller
              const allowedFileMethods = new Set(['probeContentType', 'getFile', 'toPath', 'getName', 'getOriginalFilename']);
              if (!allowedFileMethods.has(call.calledMethodName)) {
                violations.push({
                  type: 'file-io',
                  message: `Controller method '${method.name}' performs file I/O via '${call.receiverVariableName || simpleName}' (${simpleName}). Move file operations to a dedicated service.`,
                  className: cls.fullyQualifiedName, methodName: method.name,
                  receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                  range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                  severity: 'error', filePath: ast.filePath,
                  explanation: 'Controllers should not read or write files. Extract file I/O operations into a service class that your controller injects.'
                });
              }
            }
            if (this.isThreadType(simpleName)) {
              violations.push({
                type: 'background-thread',
                message: `Controller method '${method.name}' spawns or manages a thread via '${call.receiverVariableName || simpleName}' (${simpleName}). Use @Async or a TaskExecutor service instead.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                severity: 'warning', filePath: ast.filePath,
                explanation: 'Controllers should not manage threads directly. Use Spring\'s @Async annotation or a dedicated TaskExecutor service to offload background work.'
              });
            }
            if (this.isRawSQLType(simpleName)) {
              violations.push({
                type: 'raw-sql-access',
                message: `Controller method '${method.name}' accesses the database directly via '${call.receiverVariableName || simpleName}' (${simpleName}). Move data access to a repository/service layer.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                severity: 'error', filePath: ast.filePath,
                explanation: 'Controllers must not access the database directly. All data access should go through repository or service layer classes.'
              });
            }
            // Also check via FQCN (when resolved through imports differs from simple name)
            if (targetFQCN && targetFQCN !== simpleName) {
              const fqcnSimple = targetFQCN.split('.').pop() || '';
              if (this.isHttpClientType(fqcnSimple)) {
                violations.push({
                  type: 'direct-http-call',
                  message: `Controller method '${method.name}' makes an HTTP call via '${targetFQCN}'. Delegate HTTP communication to a dedicated gateway service.`,
                  className: cls.fullyQualifiedName, methodName: method.name,
                  receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                  range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                  severity: 'error', filePath: ast.filePath,
                  explanation: 'Your controller should not directly call HTTP endpoints. Move HTTP client logic into a service or gateway class that your controller injects.'
                });
              } else if (this.isFileIOType(fqcnSimple)) {
                violations.push({
                  type: 'file-io',
                  message: `Controller method '${method.name}' performs file I/O via '${targetFQCN}'. Move file operations to a dedicated service.`,
                  className: cls.fullyQualifiedName, methodName: method.name,
                  receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                  range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                  severity: 'error', filePath: ast.filePath,
                  explanation: 'Controllers should not read or write files. Extract file I/O operations into a service class that your controller injects.'
                });
              } else if (this.isThreadType(fqcnSimple)) {
                violations.push({
                  type: 'background-thread',
                  message: `Controller method '${method.name}' spawns or manages a thread via '${targetFQCN}'. Use @Async or a TaskExecutor service instead.`,
                  className: cls.fullyQualifiedName, methodName: method.name,
                  receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                  range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                  severity: 'warning', filePath: ast.filePath,
                  explanation: 'Controllers should not manage threads directly. Use Spring\'s @Async annotation or a dedicated TaskExecutor service to offload background work.'
                });
              } else if (this.isRawSQLType(fqcnSimple)) {
                violations.push({
                  type: 'raw-sql-access',
                  message: `Controller method '${method.name}' accesses the database directly via '${targetFQCN}'. Move data access to a repository/service layer.`,
                  className: cls.fullyQualifiedName, methodName: method.name,
                  receiverVariable: call.receiverVariableName, lineNumber: call.lineNumber,
                  range: call.lineNumber ? { start: { line: call.lineNumber, character: call.column || 0 }, end: { line: call.lineNumber, character: (call.column || 0) + (call.calledMethodName?.length || 8) } } : undefined,
                  severity: 'error', filePath: ast.filePath,
                  explanation: 'Controllers must not access the database directly. All data access should go through repository or service layer classes.'
                });
              }
            }
          }
          // Check object creations (self-instantiation)
          for (const creation of method.createdObjects) {
            const className = creation.className;
            if (this.isServiceClassName(className) || this.isRepositoryClassName(className) || this.isInfrastructureClassName(className)) {
              violations.push({
                  type: 'self-instantiation',
                  message: `Controller method '${method.name}' instantiates ${this.isServiceClassName(className) ? 'service' : this.isRepositoryClassName(className) ? 'repository' : 'infrastructure'} class '${className}' directly. Use dependency injection.`,
                  className: cls.fullyQualifiedName, methodName: method.name,
                  lineNumber: creation.lineNumber,
                  range: creation.lineNumber ? { start: { line: creation.lineNumber, character: 0 }, end: { line: creation.lineNumber, character: 80 } } : undefined,
                  severity: 'error', filePath: ast.filePath,
                  explanation: 'Your controller method directly constructs a service, repository, or infrastructure class instead of receiving it through dependency injection. This couples your controller to a specific concrete type and lifecycle, making it harder to unit test and maintain.'
                });
            }
            // Prohibited object creations (HTTP, file I/O, threads, raw SQL)
            if (this.isHttpClientType(className)) {
              violations.push({
                type: 'direct-http-call',
                message: `Controller method '${method.name}' directly creates an HTTP client '${className}'. Delegate HTTP communication to a dedicated gateway service.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                lineNumber: creation.lineNumber,
                range: creation.lineNumber ? { start: { line: creation.lineNumber, character: 0 }, end: { line: creation.lineNumber, character: 80 } } : undefined,
                severity: 'error', filePath: ast.filePath,
                explanation: 'Your controller directly instantiates an HTTP client. Move this to a service or gateway class and inject it instead.'
              });
            } else if (this.isFileIOType(className)) {
              violations.push({
                type: 'file-io',
                message: `Controller method '${method.name}' directly creates file I/O object '${className}'. Move file operations to a dedicated service.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                lineNumber: creation.lineNumber,
                range: creation.lineNumber ? { start: { line: creation.lineNumber, character: 0 }, end: { line: creation.lineNumber, character: 80 } } : undefined,
                severity: 'error', filePath: ast.filePath,
                explanation: 'Your controller directly creates a file I/O object. Extract file operations into a service class.'
              });
            } else if (this.isThreadType(className)) {
              violations.push({
                type: 'background-thread',
                message: `Controller method '${method.name}' directly creates a thread/executor '${className}'. Use Spring\'s @Async or a TaskExecutor service.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                lineNumber: creation.lineNumber,
                range: creation.lineNumber ? { start: { line: creation.lineNumber, character: 0 }, end: { line: creation.lineNumber, character: 80 } } : undefined,
                severity: 'warning', filePath: ast.filePath,
                explanation: 'Your controller directly creates a thread or executor. Use Spring\'s @Async annotation or a dedicated TaskExecutor service instead.'
              });
            } else if (this.isRawSQLType(className)) {
              violations.push({
                type: 'raw-sql-access',
                message: `Controller method '${method.name}' directly creates a database object '${className}'. Move data access to a repository/service layer.`,
                className: cls.fullyQualifiedName, methodName: method.name,
                lineNumber: creation.lineNumber,
                range: creation.lineNumber ? { start: { line: creation.lineNumber, character: 0 }, end: { line: creation.lineNumber, character: 80 } } : undefined,
                severity: 'error', filePath: ast.filePath,
                explanation: 'Your controller directly creates a database access object. All data access should go through repository or service layer classes.'
              });
            }
          }

          // Check for business logic in controller methods
          const businessLogicScore = method.body?.businessLogicScore ?? 0;
          if (businessLogicScore >= this.businessLogicThreshold) { // Threshold for significant business logic
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

        // Static cache detection: controllers should not hold static mutable state
        for (const field of cls.attributes) {
          if (field.isStatic) {
            const rawType = field.dataType.replace(/<.*>/g, '').trim();
            const isExplicitCache = this.isCacheType(rawType);
            const isMapType = /^(HashMap|ConcurrentHashMap|Map|ConcurrentMap|LinkedHashMap|TreeMap|SortedMap)/.test(rawType);
            const nameHint = /cache|store|pool|buffer/i.test(field.name);
            if (isExplicitCache || (isMapType && nameHint)) {
              violations.push({
                type: 'static-cache',
                message: `Controller class '${cls.className}' declares static ${isExplicitCache ? 'cache' : 'map-like'} field '${field.name}' (${field.dataType}). Static state in controllers causes issues with multiple instances and testability.`,
                className: cls.fullyQualifiedName,
                fieldName: field.name,
                severity: 'warning',
                filePath: ast.filePath,
                range: field.startLine ? {
                  start: { line: field.startLine, character: field.startColumn || 0 },
                  end: { line: field.endLine || field.startLine, character: field.endColumn || (field.startColumn || 0) + 1 },
                } : undefined,
                explanation: 'Your controller holds static state, which persists across all instances and can lead to memory leaks, concurrency issues, and testing difficulties. Store cache data in a dedicated cache service bean instead.'
              });
            }
          }
        }
      }
    }

    const seen = new Set<string>();
    return violations.filter(v => {
      const key = `${v.type}:${v.className}:${v.methodName}:${v.lineNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  private isServiceClassName(className: string): boolean {
    return this.servicePatterns.some(pattern => className.endsWith(pattern));
  }

  private isRepositoryClassName(className: string): boolean {
    return this.repositoryPatterns.some(pattern => className.endsWith(pattern));
  }

  private isInfrastructureClassName(className: string): boolean {
    return this.infrastructurePatterns.some(pattern => className.endsWith(pattern));
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

  private isHttpClientType(typeName: string): boolean {
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.httpClientPatterns.some(p => raw === p || raw.endsWith('.' + p));
  }

  private isFileIOType(typeName: string): boolean {
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.fileIOPatterns.some(p => raw === p || raw.endsWith('.' + p));
  }

  private isThreadType(typeName: string): boolean {
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.threadPatterns.some(p => raw === p || raw.endsWith('.' + p));
  }

  private isCacheType(typeName: string): boolean {
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.cacheTypePatterns.some(p => raw === p || raw.endsWith('.' + p));
  }

  private isRawSQLType(typeName: string): boolean {
    const raw = typeName.replace(/<.*>/g, '').replace(/\[\]/g, '').trim();
    return this.rawSQLPatterns.some(p => raw === p || raw.endsWith('.' + p));
  }
}