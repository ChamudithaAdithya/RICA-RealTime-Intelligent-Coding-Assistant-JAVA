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

## Detected Violations

### Controller Layer Violations

| Violation Type | Description | Severity | Trigger Conditions |
|----------------|-------------|----------|-------------------|
| `self-instantiation` | Controller directly instantiates service/repository/infrastructure classes | Error | `new ServiceImpl()`, `new UserDao()` in controller methods |
| `uninjected-service-access` | Controller accesses services/repositories without proper injection | Error/Warning | Service method called on non-injected field/parameter |
| `business-logic` | Controller method contains significant business logic | Warning | Method complexity score > 3 (long methods, many variables) |

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

## Limitations and Notes

1. **Business Logic Detection**: Currently heuristic-based due to limited access to method body text in the AST structure. Future improvements could include actual method body analysis.

2. **Layer Detection Reliance**: Depends on the backend AST parser correctly identifying controller layers via the `detectedLayer` property.

3. **Injection Detection**: Relies on the AST parser marking fields/parameters as `isInjected` when they have `@Autowired`, `@Inject`, or `@Resource` annotations.

4. **Performance**: Analysis runs on file changes and project scans, but is optimized to minimize impact on development workflow.

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