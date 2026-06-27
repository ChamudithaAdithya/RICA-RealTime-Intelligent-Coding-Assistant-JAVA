# Entity Layer Violation Detection - RICA Developer UI Extension

## Overview

This document explains the implementation of entity/domain layer violation detection in the RICA Developer UI extension. The extension now detects violations in entity/domain classes, providing comprehensive architectural guidance for maintaining proper separation of concerns in layered applications.

## Changes Made

### 1. New EntityLayerAnalyzer Class
Created `src/entityLayerDetector.ts` with a dedicated analyzer for entity/domain layer violations following the same pattern as the existing ServiceLayerAnalyzer and ControllerLayerAnalyzer.

### 2. Updated ViolationManager
Modified `src/violationManager.ts` to utilize the EntityLayerAnalyzer, combining its violations with service and controller layer violations into a single diagnostic collection.

### 3. No Changes to Extension Activation
The extension activation process remains unchanged as the ViolationManager is instantiated in the same way.

## How It Works

### Architecture Analysis Process

1. **AST Collection**: The extension parses Java files and builds Abstract Syntax Trees (ASTs) representing the code structure.

2. **Class Mapping**: The analyzer builds lookup maps of:
   - Fully qualified class names to their detected layers
   - Simple class names to possible fully qualified names (for ambiguous resolution)
   - Complete class information including methods, fields, and annotations

3. **Entity Identification**: Classes are identified as entities by their `detectedLayer` property (set by the backend AST parser).

4. **Violation Detection**: For each entity class, the analyzer checks:
   - Field-level improper dependencies on other layers
   - Method call targets for proper layer boundaries
   - Direct object instantiation of improper dependencies
   - Business logic leakage (heuristic-based)
   - Anemic entity patterns (getters/setters only)

5. **Diagnostic Reporting**: Violations are converted to VS Code diagnostics and displayed in the editor.

### Detection Mechanisms

#### Direct Layer Access Detection
- Checks method calls and object creations for services, repositories, and infrastructure classes
- Flags direct access/instantiation without proper injection
- Ensures entities don't violate layer boundaries by depending on upper layers

#### Business Logic Detection
- Uses heuristic scoring based on:
  - Method length (>10 lines = +2 points)
  - Number of local variables (>3 = +1 point)
  - Flags methods with score > 2 as containing significant business logic
  - Note: Threshold is lower than controller layer as entities should ideally have minimal logic

#### Anemic Entity Detection
- Identifies entities that consist primarily of getters and setters
- Flags as informational since some architectures prefer rich entities while others prefer anemic ones
- Helps teams align on their preferred entity modeling approach

## Detected Violations

### Entity Layer Violations

| Violation Type | Description | Severity | Trigger Conditions |
|----------------|-------------|----------|-------------------|
| `business-logic` | Entity method contains significant business logic | Warning | Method complexity score > 2 (long methods, many variables) |
| `direct-layer-access` | Entity accesses or instantiates service/repository/infrastructure classes | Error | Direct method calls or object creation on improper dependencies |
| `anemic-entity` | Entity class appears anemic (primarily getters/setters only) | Info | >80% of methods are getters/setters |
| `improper-data-access` | Entity contains direct data access logic | Error | Usage of JDBC/JPA APIs directly in entity methods |

### Service Layer Violations (Existing Functionality)

| Violation Type | Description | Severity | Trigger Conditions |
|----------------|-------------|----------|-------------------|
| `self-instantiation` | Service directly instantiates repository/infrastructure classes | Error | `new UserRepository()` in service methods |
| `uninjected-repository-access` | Service accesses repositories without injection | Error/Warning | Repository method called on non-injected field/parameter |
| `anemic-service` | Service class has no business logic (getters/setters only) | Info | Service with only simple CRUD methods |
| `package-violation` | Service accesses classes from inappropriate packages | Error/Warning | Based on configured package rules |

### Controller Layer Violations (Existing Functionality)

| Violation Type | Description | Severity | Trigger Conditions |
|----------------|-------------|----------|-------------------|
| `self-instantiation` | Controller directly instantiates service/repository/infrastructure classes | Error | `new ServiceImpl()`, `new UserDao()` in controller methods |
| `uninjected-service-access` | Controller accesses services/repositories without proper injection | Error/Warning | Service method called on non-injected field/parameter |
| `business-logic` | Controller method contains significant business logic | Warning | Method complexity score > 3 (long methods, many variables) |

## Implementation Details

### EntityLayerAnalyzer Key Methods

1. **analyze()**: Main entry point that processes all AST outputs
2. **buildClassMaps()**: Creates lookup tables for class resolution
3. **resolveTypeName()**: Resolves simple class names to fully qualified names using imports
4. **isImproperDependency()/getDependencyType()**: Identifies dependencies on upper layers
5. **isServiceClassName()/isRepositoryClassName()/isInfrastructureClassName()**: Pattern-based class classification
6. **calculateBusinessLogicScore()**: Heuristic-based business logic detection
7. **isAnemicEntity()**: Detects getter/setter-only entity patterns

### ViolationManager Updates

- Now maintains separate analyzers for service, controller, and entity layers
- Combines violations from all three sources
- Uses unified diagnostic collection: `java-layer-analyzer`
- Preserves all existing service and controller layer detection functionality
- Maintains same diagnostic formatting and severity mapping

## Configuration

No additional configuration is required. The entity layer detection works automatically alongside existing service and controller layer detection.

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

### Business Logic in Entity
```java
@Entity
public class Order {
    // ... fields
    
    public BigDecimal calculateTotal() {
        // VIOLATION: Significant business logic in entity
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem item : items) {
            total = total.add(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            
            // Apply complex business rules
            if (item.getProduct().isPerishable()) {
                // Freshness discount logic
                total = total.multiply(BigDecimal.valueOf(0.95));
            }
            
            // Bulk discount logic
            if (item.getQuantity() > 10) {
                total = total.multiply(BigDecimal.valueOf(0.9));
            }
        }
        
        // Tax calculation
        total = total.add(total.multiply(BigDecimal.valueOf(0.08)));
        
        return total;
    }
}
```

### Direct Layer Access
```java
@Entity
public class User {
    // ... fields
    
    public void save() {
        // VIOLATION: Direct repository access
        UserRepository repo = new UserRepositoryImpl();
        repo.save(this);
    }
    
    public void sendWelcomeEmail() {
        // VIOLATION: Direct service access
        EmailService emailService = new EmailServiceImpl();
        emailService.sendWelcomeEmail(this.getEmail());
    }
}
```

### Anemic Entity
```java
@Entity
public class Product {
    @Id
    private Long id;
    
    private String name;
    private BigDecimal price;
    private Integer stock;
    
    // Only getters and setters - no business logic
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    // ... other getters/setters
}
```

## Limitations and Notes

1. **Business Logic Detection**: Currently heuristic-based due to limited access to method body text in the AST structure. Future improvements could include actual method body analysis.

2. **Layer Detection Reliance**: Depends on the backend AST parser correctly identifying entity layers via the `detectedLayer` property.

3. **Injection Detection**: Relies on the AST parser marking fields/parameters as `isInjected` when they have `@Autowired`, `@Inject`, or `@Resource` annotations.

4. **Anemic Entity Detection**: This is somewhat controversial as different architectural styles (DDD vs. anemic models) have different preferences. The detection is flagged as info to allow teams to decide based on their architectural guidelines.

5. **Performance**: Analysis runs on file changes and project scans, but is optimized to minimize impact on development workflow.

## Future Improvements

1. Enhanced business logic detection with actual method body analysis
2. More sophisticated violation ranking and prioritization
3. Configurable violation thresholds and patterns
4. Integration with code fix suggestions (quick fixes)
5. Support for additional architectural layers and patterns
6. Better distinction between rich vs. anemic entity preferences based on project configuration

## Files Modified/Added

1. **Added**: `src/entityLayerDetector.ts` - New entity layer analyzer
2. **Modified**: `src/violationManager.ts` - Updated to use all three analyzers
3. **No changes**: `src/extension.ts` - Extension activation unchanged
4. **No changes**: Package.json - No new dependencies required

## Testing

The implementation was verified by:
- Compiling the TypeScript project with no errors
- Confirming that existing service and controller layer detection still works
- Verifying the new entity layer detection follows the same patterns
- Ensuring proper imports and type safety throughout

## Conclusion

This implementation extends the RICA Developer UI extension to provide comprehensive architectural layer violation detection for entity/domain classes alongside service and controller layers. Developers now receive immediate feedback on common architectural mistakes, helping them maintain clean separation of concerns in their Java applications.

The solution follows existing code patterns, maintains backward compatibility, and integrates seamlessly with the extension's existing infrastructure.