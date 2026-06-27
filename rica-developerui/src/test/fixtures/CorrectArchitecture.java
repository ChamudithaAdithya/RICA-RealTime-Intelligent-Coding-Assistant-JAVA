/**
 * RICA Correct Architecture Reference
 * =====================================
 * These snippets demonstrate the architecture patterns the analyzer considers correct.
 *
 * --- Layer Rules ---
 * Controller  → depends on → Service (via injection)
 * Service     → depends on → Repository (via injection)
 * Service     → depends on → Entity (for business logic)
 * API Resource→ depends on → Service (via injection), DTOs
 * Entity      → no external layer dependencies (pure data + behaviour)
 *
 * --- Dependency Injection ---
 * All cross-layer dependencies MUST be injected (constructor or @Autowired).
 * Self-instantiation (new XXXService()) across layers is forbidden.
 *
 * --- Business Logic ---
 * Business logic belongs in Service layer, NOT in Controllers or API Resources.
 * Entities should have behaviour related to self, not orchestration.
 *
 * --- API Layer ---
 * REST/GraphQL resources must NOT expose entities directly;
 * DTOs/response objects are required.
 *
 * --- Files ---
 * @see WellArchitectedService.java
 * @see WellArchitectedController.java
 */
public class CorrectArchitecture {
    // Architecture reference only — see individual fixture files.
}
