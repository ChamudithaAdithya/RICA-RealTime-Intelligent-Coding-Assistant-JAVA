# Service Layer Detection Capabilities

## What CAN Be Detected with Current AST JSON Structure

### 1. Direct Database/Infrastructure Access
- **JDBC calls**: `Connection`, `Statement`, `ResultSet`, `PreparedStatement`
- **JPA EntityManager**: `@PersistenceContext` direct usage, `entityManager.persist()`, `createQuery()`
- **Spring Data repositories** (if not injected): `new UserRepository()`
- **MyBatis/Hibernate direct usage**

**Detection method**: Check `calledMethods` and `createdObjects` for database/ORM classes from packages:
- `java.sql.*`
- `javax.persistence.*` / `jakarta.persistence.*`
- `org.hibernate.*`
- `org.mybatis.*`

### 2. Violation of Dependency Rule
- Services instantiating their own dependencies (via `new` operator)
- Services creating repositories directly instead of receiving them via constructor/properties

**Detection method**: 
- `createdObjects` with classes from `repository.*`, `dao.*`, `mapper.*` packages
- Constructor injection verification through field declarations and method parameters

### 3. Direct External API/HTTP Calls
- Services making HTTP requests without going through a client/facade layer
- `RestTemplate`, `HttpClient`, `WebClient` direct instantiation

**Detection method**: Check for:
- Instantiations of `RestTemplate`, `HttpClient`, `WebClient`
- Calls to methods from `org.apache.http.*`, `java.net.http.*`

### 4. Package Boundary Violations
- Service classes importing from lower layers (persistence, infrastructure)
- Cross-package calls that violate the dependency direction

**Detection method**: Analyze `imports` array and `allExternalDependencies` to ensure Services only depend on:
- Domain/Entity packages
- Other Service packages
- DTO/Model packages
- NOT: `repository`, `dao`, `mapper`, `entity` (as JPA entities are domain, but repositories are infrastructure)

### 5. Anemic Service Pattern (Pass-Through Services)
- Services that are trivial wrappers with no business logic
- Methods that just delegate to repositories without any logic

**Detection method**:
- Compare method body size (LOC) vs complexity
- Check if `calledMethods` only contains repository methods
- Verify no business rules/validations are applied

### 6. Transaction Management Outside Repository
- Services managing transactions manually (if supposed to be declarative)

**Detection method**: Look for `@Transactional` annotations or transaction API calls

### 7. Mixed Responsibilities
- Service methods that handle both business logic AND data transformation/formatting
- Detection can check for usage of DTO conversion libraries within service methods

---

## What CANNOT Be Fully Detected (Limitations)

### ❌ **Not Fully Detectable** or Require Context:

1. **Business Logic Quality**
   - Cannot determine if business rules are correctly implemented
   - Cannot verify domain expertise correctness

2. **Performance Patterns**
   - N+1 query problems (requires knowing SQL queries and loop context)
   - Inefficient algorithms

3. **Transaction Boundaries**
   - Whether transaction demarcation is appropriate (needs domain knowledge)
   - Rollback rules correctness

4. **Dependency Inversion Violations**
   - Cannot always detect if a service depends on an abstraction or concrete class
   - Need to track interface implementations and injection points more deeply

5. **External Service Calls Through Clients**
   - If a Service uses an injected `PaymentGatewayClient`, it's OK
   - But if `PaymentGatewayClient` is instantiated directly in the Service, it's NOT OK
   - Requires distinguishing injected vs. instantiated dependencies

6. **Framework-Specific Patterns**
   - Spring `@Service` vs `@Component` vs custom annotations
   - Aspect-oriented programming (transactions, logging via aspects)
   - Dependency injection annotations (`@Autowired`, `@Inject`)

7. **Service Layer vs Application Service vs Domain Service**
   - Different architectures have different meanings for "Service"
   - Without layer naming conventions or explicit architecture rules, ambiguous

8. **CQRS/Mediator Patterns**
   - Service might be thin handler delegating to commands/queries
   - Trivial methods might be acceptable in this pattern

9. **Testability and Design Quality**
   - Whether services are properly decoupled and mockable
   - Whether interfaces are properly defined

10. **Conditional Logic for Layer Detection**
    - A class might be both Repository and Service (anti-pattern, but hard to detect)
    - Mixed annotations: `@Repository` on a service class

---

## Detection Gaps That Need Additional Rules

### 1. **Implicit vs Explicit Dependencies**
The AST shows `calledMethods` but doesn't always distinguish:
- Method call on an injected dependency ✅
- Method call on a locally instantiated object ❌
- Method call on a static utility class (may be OK or not)

**Solution needed**: Track variable declarations and assignments to distinguish.

### 2. **Dynamic Class Loading/Reflection**
- `Class.forName()`, `Method.invoke()` bypass static analysis
- Cannot determine which class is actually being used

### 3. **Qualifier/Resource Lookups**
- `@Resource(name="userRepository")` vs `new UserRepositoryImpl()`
- Need annotation processing with injection metadata

### 4. **Circular Dependencies**
- AST can detect calls from Service → Repository → Service
- But needs full call graph analysis across all classes

### 5. **Package Naming Conventions**
- Detection relies on package names to identify layer boundaries
- Non-standard naming (`persistence` instead of `repository`) would be missed
- Need configuration to define layer rules per package

### 6. **Third-Party Libraries That Are "OK"**
- Some services may legitimately use logging libraries, validation APIs
- Need whitelist of allowed classes per layer

---

## Required Additional Analysis Beyond AST

### 1. **Symbol Resolution**
- Track which variable refers to which object type
- Map method calls to their target class (not just method name)
- Current `MethodCall` has `targetClass?` (optional) - this needs full type resolution

### 2. **Control Flow Analysis**
- Determine if database calls are inside loops (N+1)
- Track conditional logic that might bypass important checks

### 3. **Inter-Procedural Analysis**
- Follow method calls across method boundaries
- Build complete call graph from entry points

### 4. **Data Flow Analysis**
- Track where objects originate (injected vs created)
- Detect if a repository field is reassigned

---

## Recommended Enhancements to JSON Structure

To improve detection, extend the AST to include:

```typescript
interface Variable {
  name: string;
  declaredType: string;
  assignedFrom?: string; // e.g., "parameter", "new SomeClass()", "field"
  isInjected: boolean;   // true if from DI (e.g., @Autowired field)
}

interface FieldInfo {
  name: string;
  type: string;
  isInjected: boolean;      // Has @Inject/@Autowired/@Resource
  injectionPoint: 'constructor' | 'field' | 'setter' | 'none';
}

interface MethodInvocation {
  methodName: string;
  receiverVariable?: string; // Which variable the method is called on
  receiverType?: string;     // Resolved type of receiver
  isOnNewInstance: boolean;  // Called immediately after new?
}
```

These would enable:
- Distinguishing `userRepository.save()` (injected) from `new UserRepository().save()` (violation)
- Tracking dependency injection patterns
- Building accurate call graphs

---

## Summary

**Can we detect ALL legitimate Service layer patterns with the current JSON?**

**No**, but we can detect a **significant subset** of common violations:

✅ **Detectable with high confidence**:
- Direct database access (JDBC/JPA direct usage)
- Services instantiating their own infrastructure dependencies
- Clear package boundary violations
- Anemic services (trivial pass-through)

⚠️ **Detectable with moderate confidence** (need rule tuning):
- External API calls without abstraction
- Mixed responsibilities
- Transaction management issues

❌ **Not reliably detectable**:
- Business logic quality
- Performance issues (N+1)
- Proper abstraction design
- Framework-specific patterns without explicit metadata
- Dynamic/reflective code

**Conclusion**: The AST structure is **sufficient for basic architectural enforcement** but requires:
1. Clear package naming conventions
2. Configuration of allowed dependencies per layer
3. Additional analysis (symbol resolution, call graph) for advanced patterns
4. Human review for borderline cases

