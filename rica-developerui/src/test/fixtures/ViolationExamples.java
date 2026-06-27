/**
 * RICA Violation Pattern Reference
 * ================================
 * This file documents (visually) every violation pattern the analyzer detects.
 * Actual tests embed these patterns in compilable Java source.
 *
 * --- Service Layer Violations ---
 * - SELF-INSTANTIATION: new UserRepository() instead of injecting
 * - UNINJECTED-REPOSITORY-ACCESS: repository field without @Autowired or constructor injection
 * - UNINJECTED-SERVICE-ACCESS: service field without injection (in a controller)
 *
 * --- Controller Layer Violations ---
 * - BUSINESS-LOGIC: complex computation/validation directly in controller method
 * - SELF-INSTANTIATION: new SomeService() inside controller
 *
 * --- Entity Layer Violations ---
 * - ANEMIC-ENTITY: only getters/setters, no behaviour
 * - BUSINESS-LOGIC: entity accessing Repository/Service
 * - DIRECT-LAYER-ACCESS: entity referencing infrastructure layer
 *
 * --- API Resource Layer Violations ---
 * - EXPOSING-INTERNAL-ENTITY: returning Entity type from public method
 * - MISSING-VALIDATION: @RequestBody parameter without @Valid
 * - BUSINESS-LOGIC-IN-RESOURCE: computation in resource method
 * - MISSING-DTO-USAGE: no DTO/response wrapper
 *
 * --- Cross-File/Graph Violations ---
 * - CONTROLLER-BYPASS: service depends on another service that depends on controller
 * - CYCLIC-DEPENDENCY: A→B→C→A
 * - CROSS-LAYER-VIOLATION: entity refers to repository/service
 * - ENTITY-EXPOSURE: controller exposes entity via return type
 */
public class ViolationExamples {
    // Pattern reference only.
}
