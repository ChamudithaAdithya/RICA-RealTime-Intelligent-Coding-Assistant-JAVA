# Controller Layer Violation Detection - RICA Developer UI Extension

## Overview

This document explains the implementation of controller layer violation detection in the RICA Developer UI extension. The extension now detects both service layer and controller layer violations in Java applications, providing comprehensive architectural guidance.

## Changes Made

### 1. New ControllerLayerAnalyzer Class
Created `src/controllerLayerDetector.ts` with a dedicated analyzer for controller layer violations following the same pattern as the existing ServiceLayerAnalyzer.

### 2. Updated ViolationManager
Modified `src/violationManager.ts` to utilize both ServiceLayerAnalyzer and ControllerLayerAnalyzer, combining their violations into a single diagnostic collection.

### 3. No Changes to Extension Activation
The extension activation process remains unchanged as the ViolationManager is instantiated in the same way.

## How It Works

### Architecture Analysis Process

1. **AST Collection**: The extension parses Java files and builds Abstract Syntax Trees (ASTs) representing the code structure.

2. **Class Mapping**: Both analyzers build lookup maps of:
   - Fully qualified class names to their detected layers
   - Simple class names to possible fully qualified names (for ambiguous resolution)
   - Complete class information including methods, fields, and annotations

3. **Controller Identification**: Classes are identified as controllers by their `detectedLayer` property (set by the backend AST parser).

4. **Violation Detection**: For each controller class, the analyzer checks:
   - Field-level dependency injection
   - Method call targets for proper injection
   - Direct object instantiation (self-instantiation)
   - Business logic leakage (heuristic-based)

5. **Diagnostic Reporting**: Violations are converted to VS Code diagnostics and displayed in the editor.

### Detection Mechanisms

#### Self-Instantiation Detection
- Checks `createdObjects` in method bodies
- Flags direct instantiation of:
  - Service classes (ending with Service, Manager, Handler)
  - Repository classes (ending with Repository, Dao, DAO, Persistence, etc.)
  - Infrastructure classes (ending with Client, Gateway, Connector, etc.)

#### Uninjected Access Detection
- Analyzes `calledMethods` in method bodies
- Verifies that calls to service/repository/infrastructure classes use injected dependencies
- Checks both field access and parameter/method call receivers

#### Business Logic Detection
- Uses heuristic scoring based on:
  - Method length (>20 lines = +2 points)
  - Number of local variables (>5 = +1 point)
  - Flags methods with score > 3 as containing significant business logic

#### Architectural Pattern Detection (V110–V114)
- **Direct HTTP Calls**: Checks every method call's receiver type against a list of HTTP client types (`HttpClient`, `RestTemplate`, `WebClient`, `OkHttpClient`, `HttpURLConnection`, `CloseableHttpClient`, etc.). Also checks object creations (`new RestTemplate()`) against the same list. Both simple names and fully-qualified names (resolved through imports) are checked.
- **File I/O**: Same dual-path (calls + creations) against file I/O types (`File`, `FileInputStream`, `FileWriter`, `Files`, `Path`, `BufferedReader`, etc.).
- **Background Threads**: Same dual-path against thread/executor types (`Thread`, `ExecutorService`, `CompletableFuture`, `Timer`, `Runnable`, `Callable`, etc.).
- **Raw SQL Access**: Same dual-path against database types (`DataSource`, `JdbcTemplate`, `EntityManager`, `Connection`, `Statement`, `Session`, `SqlSession`, etc.).
- **Static Cache**: After method analysis completes, scans all class fields for `static` fields with cache-specific types (`Cache`, `CacheManager`, `LoadingCache`, `Caffeine`, etc.) or Map types (`HashMap`, `ConcurrentHashMap`, `Map`) whose name contains \"cache\", \"store\", \"pool\", or \"buffer\".

## Detected Violations

### Controller Layer Violations

| Violation Type | Code | Description | Severity | Trigger Conditions |
|----------------|------|-------------|----------|-------------------|
| `self-instantiation` | V101 | Controller directly instantiates service/repository/infrastructure classes | Error | `new ServiceImpl()`, `new UserDao()` in controller methods |
| `uninjected-service-access` | V103 | Controller accesses services/repositories without proper injection | Error/Warning | Service method called on non-injected field/parameter |
| `business-logic` | V106 | Controller method contains significant business logic | Warning | Method complexity score > 3 (long methods, many variables) |
| `direct-http-call` | V110 | Controller makes direct HTTP calls | Error | Calls on HttpClient, RestTemplate, WebClient, OkHttpClient, HttpURLConnection, or `new` of these types |
| `file-io` | V111 | Controller performs file I/O | Error | Calls on File, FileInputStream, FileWriter, Files, Path, BufferedReader, or `new` of these types |
| `background-thread` | V112 | Controller spawns/manages threads | Warning | Calls on Thread, ExecutorService, CompletableFuture, Timer, Runnable, or `new` of these types |
| `static-cache` | V113 | Controller holds static cache/Map state | Warning | Static field with cache type (Cache, CacheManager, LoadingCache) or Map named \*cache\*/\*store\*/\*pool\* |
| `raw-sql-access` | V114 | Controller accesses database directly | Error | Calls on DataSource, JdbcTemplate, EntityManager, Connection, Statement, Session, or `new` of these types |

### Service Layer Violations (Existing Functionality)

| Violation Type | Description | Severity | Trigger Conditions |
|----------------|-------------|----------|-------------------|
| `self-instantiation` | Service directly instantiates repository/infrastructure classes | Error | `new UserRepository()` in service methods |
| `uninjected-repository-access` | Service accesses repositories without injection | Error/Warning | Repository method called on non-injected field/parameter |
| `anemic-service` | Service class has no business logic (getters/setters only) | Info | Service with only simple CRUD methods |
| `package-violation` | Service accesses classes from inappropriate packages | Error/Warning | Based on configured package rules |

## Implementation Details

### ControllerLayerAnalyzer Key Methods

1. **analyze()**: Main entry point that processes all AST outputs
2. **buildClassMaps()**: Creates lookup tables for class resolution
3. **resolveTypeName()**: Resolves simple class names to fully qualified names using imports
4. **isServiceClassName()/isRepositoryClassName()/isInfrastructureClassName()**: Pattern-based class classification
5. **isServiceType()/isRepositoryType()**: Type checking for fields and parameters
6. **calculateBusinessLogicScore()**: Heuristic-based business logic detection

### ViolationManager Updates

- Now maintains separate analyzers for service and controller layers
- Combines violations from both sources
- Uses unified diagnostic collection: `java-layer-analyzer`
- Preserves all existing service layer detection functionality
- Maintains same diagnostic formatting and severity mapping

## Configuration

No additional configuration is required. The controller layer detection works automatically alongside existing service layer detection.

### Existing Configuration Options (unchanged)
- `javaAstAnalyzer.backendUrl`: Backend server URL for AST parsing
- `javaAstAnalyzer.autoAnalyzeOnOpen`: Automatic analysis on workspace open
- `javaAstAnalyzer.debounceDelay`: Debounce for file change events
- `javaAstAnalyzer.excludePatterns`: File patterns to exclude from analysis

## Usage

1. Open any Java file in your workspace
2. The extension automatically analyzes the file (if auto-analyze is enabled)
3. Violations appear as:
   - Red squiggles for errors
   - Yellow squiggles for warnings
   - Blue squiggles for info
4. Hover over violations to see detailed messages
5. Check the Problems panel (Ctrl+Shift+M) for a list of all violations

## Example Violations Detected

### Self-Instantiation
```java
@Controller
public class UserController {
    public void createUser() {
        // VIOLATION: Self-instantiation of repository
        UserRepository repo = new UserRepositoryImpl();
        repo.save(new User());
    }
}
```

### Uninjected Access
```java
@Controller
public class UserController {
    private UserService userService; // Missing @Autowired
    
    public void getUser(int id) {
        // VIOLATION: Uninjected service access
        User user = userService.findById(id);
    }
}
```

### Business Logic
```java
@RestController
public class OrderController {
    public ResponseEntity<Order> placeOrder(OrderRequest request) {
        // VIOLATION: Significant business logic in controller
        if (request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must have items");
        }
        
        double total = 0;
        for (Item item : request.getItems()) {
            total += item.getPrice() * item.getQuantity();
            // ... complex validation and calculation logic
        }
        
        if (total > 1000) {
            // Apply discount logic
            total *= 0.9;
        }
        
        // ... more business logic
        return ResponseEntity.ok(new Order(total));
    }
}
```

### Direct HTTP Call
```java
@RestController
public class OrderController {
    private final RestTemplate restTemplate; // Injected, but still an architectural concern

    public OrderController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public OrderDto getOrder(int id) {
        // VIOLATION: Direct HTTP call to another service — use a gateway service
        ResponseEntity<InventoryDto> response = restTemplate.getForEntity(
            "http://inventory-service/api/items/" + id, InventoryDto.class);
        return mapToOrder(response.getBody());
    }
}
```

### File I/O
```java
@RestController
public class ReportController {
    @GetMapping("/report")
    public ResponseEntity<byte[]> downloadReport() {
        // VIOLATION: File I/O in controller — move to a service
        File file = new File("/tmp/report.pdf");
        byte[] data = Files.readAllBytes(file.toPath());
        return ResponseEntity.ok(data);
    }
}
```

### Background Thread
```java
@RestController
public class AsyncController {
    @PostMapping("/process")
    public ResponseEntity<String> startProcess() {
        // VIOLATION: Controller spawns a thread — use @Async
        new Thread(() -> {
            // long running task
        }).start();
        return ResponseEntity.accepted().body("Processing started");
    }
}
```

### Static Cache
```java
@RestController
public class CachingController {
    // VIOLATION: Static cache state in controller
    private static final Map<String, User> userCache = new ConcurrentHashMap<>();

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable String id) {
        return userCache.computeIfAbsent(id, this::fetchUser);
    }
}
```

### Raw SQL Access
```java
@RestController
public class UserController {
    @Autowired
    private DataSource dataSource; // Injected, but controllers should not access DB

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable long id) throws SQLException {
        // VIOLATION: Raw SQL in controller — use a repository
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return mapUser(rs);
            }
        }
        return null;
    }
}
```

## Limitations and Notes

1. **Business Logic Detection**: Currently heuristic-based due to limited access to method body text in the AST structure. Future improvements could include actual method body analysis.

2. **Layer Detection Reliance**: Depends on the backend AST parser correctly identifying controller layers via the `detectedLayer` property.

3. **Injection Detection**: Relies on the AST parser marking fields/parameters as `isInjected` when they have `@Autowired`, `@Inject`, or `@Resource` annotations.

4. **Performance**: Analysis runs on file changes and project scans, but is optimized to minimize impact on development workflow.

5. **Architectural Pattern Detection (V110–V114)**: Relies on simple-name and import-resolved FQCN matching against type pattern lists. Standard library types with wildcard imports (e.g., `import java.net.http.*`) may not resolve to their FQCN, so the detector checks both raw simple names and resolved FQCNs to maximize coverage.

6. **Static Cache Detection**: Only flags `static` fields with explicit cache types or Map types with cache-hinting names. Inline cache usage (e.g., `ConcurrentHashMap` created inside a method) is not detected at the field level.

7. **Call Chain Coverage**: If a controller calls `helper.getHttpClient().send(...)`, the intermediate type `helper` may not be an HTTP client — the call is matched on receiver type. The current heuristic checks the final receiver type, which covers the most common pattern (`restTemplate.getForEntity()`, `httpClient.send()`).

## Future Improvements

1. Enhanced business logic detection with actual method body analysis
2. More sophisticated violation ranking and prioritization
3. Configurable violation thresholds and patterns
4. Integration with code fix suggestions (quick fixes)
5. Support for additional architectural layers and patterns

## Files Modified/Added

1. **Added**: `src/controllerLayerDetector.ts` - New controller layer analyzer
2. **Modified**: `src/violationManager.ts` - Updated to use both analyzers
3. **No changes**: `src/extension.ts` - Extension activation unchanged
4. **No changes**: Package.json - No new dependencies required

## Testing

The implementation was verified by:
- Compiling the TypeScript project with no errors
- Confirming that existing service layer detection still works
- Verifying the new controller layer detection follows the same patterns
- Ensuring proper imports and type safety throughout

## Conclusion

This implementation extends the RICA Developer UI extension to provide comprehensive architectural layer violation detection for both service and controller layers. Developers now receive immediate feedback on common architectural mistakes, helping them maintain clean separation of concerns in their Java applications.

The solution follows existing code patterns, maintains backward compatibility, and integrates seamlessly with the extension's existing infrastructure.