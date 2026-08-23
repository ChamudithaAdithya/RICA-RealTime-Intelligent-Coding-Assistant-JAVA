"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixSuggestionEngine = void 0;
const violationCatalog_1 = require("./violationCatalog");
function label(v) {
    return v.contextMetadata?.methodName
        || v.contextMetadata?.fieldName
        || v.contextMetadata?.targetComponent
        || v.ruleName;
}
function target(v) {
    return v.contextMetadata?.targetComponent || v.contextMetadata?.receiverVariable || 'the dependency';
}
function fieldLine(v) {
    return v.lineNumber || v.range?.start.line;
}
function suggestion(v, title, safety, steps, description) {
    return {
        title,
        safety,
        description: description || violationCatalog_1.VIOLATION_DOC_BY_CODE[v.code || '']?.mitigationHint || v.mitigationHint,
        steps,
    };
}
function annotationSuggestion(v, annotation, title, description) {
    const line = fieldLine(v);
    if (!line || !v.filePath)
        return undefined;
    return {
        title,
        description,
        safety: 'preview-required',
        steps: [
            `Insert ${annotation} at the flagged declaration.`,
            'Verify the required import is present or use the fully qualified annotation name.',
            'Prefer constructor injection or domain-specific authorization/validation when possible.',
        ],
        edits: [{
                filePath: v.filePath,
                line,
                kind: 'insertBefore',
                text: annotation,
            }],
    };
}
const DESIGN_PATTERN_STEPS = {
    'RICA-V301': ['Create an adapter around the external SDK/API type.', 'Depend on a local port/interface from application code.', 'Move SDK-specific calls into the adapter implementation.'],
    'RICA-V302': ['Identify the responsibilities grouped inside the facade.', 'Move domain behavior into cohesive services or domain objects.', 'Keep the facade as a thin orchestration boundary only if clients still need one entry point.'],
    'RICA-V303': ['Extract the varying branch behavior into a strategy interface.', 'Create one implementation per branch/type.', 'Inject or select the strategy through a registry/factory.'],
    'RICA-V304': ['Create a factory for the repeated concrete construction.', 'Return an abstraction where callers do not need the concrete type.', 'Move object creation policy out of the calling method.'],
    'RICA-V305': ['Replace static mutable state with an injected scoped bean.', 'Use immutable configuration for constants.', 'If shared cache is intended, use a cache manager with explicit lifecycle.'],
    'RICA-V306': ['Move thread creation to a TaskExecutor/@Async boundary.', 'Inject the executor instead of constructing threads directly.', 'Keep business methods unaware of thread lifecycle.'],
    'RICA-V307': ['Decide whether the abstraction is useful.', 'If not useful, inline it and depend on the concrete class.', 'If useful, add another real implementation or reference it from client code.'],
    'RICA-V308': ['Move complex construction into a builder or factory.', 'Keep the calling method focused on orchestration.', 'Name the builder/factory after the object creation policy.'],
    'RICA-V309': ['Split the interface by client responsibility.', 'Move rarely used methods into smaller role interfaces.', 'Update clients to depend only on the methods they use.'],
    'RICA-V310': ['Wrap the write sequence in a command object or transactional service method.', 'Make the command represent one business action.', 'Keep persistence writes behind a clear boundary.'],
    'RICA-V311': ['Introduce a copy constructor, clone method, or mapper utility.', 'Replace repeated setter/getter copying with the copy abstraction.', 'Keep mapping-only code separate from business logic.'],
    'RICA-V312': ['Merge fragmented factories for the same product family.', 'Keep creation rules in one factory/abstract factory.', 'Give callers one creation entry point.'],
    'RICA-V313': ['Move logging/metrics/tracing into a decorator or aspect.', 'Keep the core service method focused on business behavior.', 'Wrap the component at the boundary where cross-cutting behavior belongs.'],
    'RICA-V314': ['Introduce a common component interface.', 'Move child traversal into composite nodes.', 'Replace instanceof traversal with polymorphic dispatch.'],
    'RICA-V315': ['Cache/reuse immutable value objects created repeatedly.', 'Use a factory for canonical instances.', 'Confirm the object is truly immutable before sharing.'],
    'RICA-V316': ['Move state-specific behavior into State classes or enum methods.', 'Keep transitions explicit and centralized.', 'Replace scattered status branching with polymorphism.'],
    'RICA-V317': ['Extract the shared algorithm skeleton into a template method or collaborator.', 'Keep varying steps overridable/injected.', 'Avoid extracting pure DTO mapping noise.'],
    'RICA-V318': ['Introduce a NotificationChannel/Notifier abstraction.', 'Register concrete notifier implementations.', 'Iterate over configured channels instead of hardcoding each call.'],
    'RICA-V319': ['Split guard clauses into a validation pipeline.', 'Create one validator per rule or responsibility.', 'Stop at the first failure or collect errors consistently.'],
    'RICA-V320': ['Inject the dependency directly instead of resolving it dynamically.', 'Remove ApplicationContext/ServiceLocator access from business code.', 'Keep service lookup in configuration/bootstrap code only.'],
    'RICA-V321': ['Return Null Object, Optional, or empty collections where appropriate.', 'Centralize defensive validation at the boundary.', 'Avoid scattered null decisions inside business workflow code.'],
    'RICA-V322': ['Wrap the heavy resource behind a proxy/gateway.', 'Inject the wrapper instead of constructing the resource directly.', 'Keep resource lifecycle in infrastructure/configuration code.'],
    'RICA-V323': ['Split abstraction and implementation dimensions.', 'Introduce a bridge interface for the varying implementation side.', 'Compose variants instead of multiplying subclasses.'],
};
class FixSuggestionEngine {
    enrich(violations) {
        return violations.map(v => this.enrichOne(v));
    }
    enrichOne(v) {
        const remediationSuggestions = this.suggest(v);
        const quickFix = v.quickFix || this.toPreferredQuickFix(remediationSuggestions);
        return {
            ...v,
            remediationSuggestions,
            quickFix,
        };
    }
    toPreferredQuickFix(suggestions) {
        const fix = suggestions.find(s => s.edits?.length && s.safety !== 'manual-design-required');
        if (!fix?.edits?.length)
            return undefined;
        return {
            title: fix.title,
            description: fix.description,
            edits: fix.edits,
        };
    }
    suggest(v) {
        switch (v.code) {
            case 'RICA-V102':
                return [
                    annotationSuggestion(v, '@Autowired', 'Inject repository field', `Inject ${target(v)} through Spring instead of leaving it unmanaged.`),
                    suggestion(v, 'Prefer constructor injection', 'manual-design-required', [
                        `Add ${target(v)} as a constructor parameter.`,
                        `Assign it to the field '${v.contextMetadata?.fieldName || 'repository'}'.`,
                        'Remove field injection if constructor injection is adopted.',
                    ]),
                ].filter(Boolean);
            case 'RICA-V103':
            case 'RICA-V205':
                return [
                    annotationSuggestion(v, '@Autowired', 'Inject service dependency', `Inject ${target(v)} instead of constructing or accessing it directly.`),
                    suggestion(v, 'Route controller/resource work through an injected service', 'manual-design-required', [
                        'Create or reuse a service method that owns the application workflow.',
                        'Inject the service into the controller/resource.',
                        'Keep the endpoint focused on request/response mapping.',
                    ]),
                ].filter(Boolean);
            case 'RICA-V206':
                return [
                    annotationSuggestion(v, '@Valid', 'Add request validation marker', 'Mark the flagged request object for validation.'),
                    suggestion(v, 'Add precise validation constraints', 'preview-required', [
                        'Add @Valid to request-body DTO parameters.',
                        'Add field constraints such as @NotNull, @NotBlank, @Size, @Min, or @Max.',
                        'Keep simple @PathVariable/@RequestParam values constrained only when the domain requires it.',
                    ]),
                ].filter(Boolean);
            case 'RICA-V101':
                return [suggestion(v, 'Replace direct construction with dependency injection', 'manual-design-required', [
                        `Stop constructing ${target(v)} inside '${label(v)}'.`,
                        'Add the dependency as a constructor parameter or injected field.',
                        'Let the DI container own lifecycle and implementation choice.',
                    ])];
            case 'RICA-V104':
                return [suggestion(v, 'Move behavior into the service or remove the empty service', 'manual-design-required', [
                        'Find the controller/entity/helper code currently holding the business rule.',
                        'Move validation, calculation, or orchestration into the service.',
                        'If the service only delegates and adds no value, remove it or rename it to a gateway/adapter role.',
                    ])];
            case 'RICA-V106':
            case 'RICA-V204':
                return [suggestion(v, 'Move business logic to the service layer', 'manual-design-required', [
                        `Extract the business decisions from '${label(v)}'.`,
                        'Create a service method with a domain-specific name.',
                        'Have the controller/resource delegate to that service method.',
                    ])];
            case 'RICA-V107':
            case 'RICA-V109':
                return [suggestion(v, 'Keep entity/domain code persistence-free', 'manual-design-required', [
                        'Move repository, JDBC, filesystem, or infrastructure access out of the entity.',
                        'Expose a domain method that changes only entity state.',
                        'Let the service/repository coordinate persistence.',
                    ])];
            case 'RICA-V108':
                return [suggestion(v, 'Add meaningful domain behavior or accept as DTO-style data', 'manual-design-required', [
                        'Add invariant methods, state transitions, or calculations owned by this entity.',
                        'Keep behavior self-contained: use own fields and domain collaborators only.',
                        'If the class is intentionally data-only, consider DTO/value-object naming to reduce ambiguity.',
                    ])];
            case 'RICA-V110':
            case 'RICA-V111':
            case 'RICA-V112':
            case 'RICA-V113':
            case 'RICA-V114':
                return [suggestion(v, 'Move infrastructure work behind an injected boundary', 'manual-design-required', [
                        `Move '${label(v)}' infrastructure behavior out of the controller.`,
                        'Create a gateway/service/cache/repository abstraction for the operation.',
                        'Inject that abstraction into the controller and delegate to it.',
                    ])];
            case 'RICA-V201':
            case 'RICA-V202':
            case 'RICA-V207':
            case 'RICA-V404':
                return [suggestion(v, 'Use a DTO at the API boundary', 'manual-design-required', [
                        'Create a request/response DTO that exposes only API contract fields.',
                        'Map between DTO and domain/entity inside the service or mapper layer.',
                        'Avoid returning persistence/domain internals directly from endpoints.',
                    ])];
            case 'RICA-V203':
                return [suggestion(v, 'Handle endpoint errors explicitly', 'preview-required', [
                        'Replace broad Exception/RuntimeException exposure with a typed application exception.',
                        'Map exceptions to clear HTTP responses through @ControllerAdvice or local handling.',
                        'Do not return stack traces or raw exception details to clients.',
                    ])];
            case 'RICA-V401':
            case 'RICA-V402':
            case 'RICA-V403':
            case 'RICA-V501':
                return [suggestion(v, 'Restore the intended dependency direction', 'manual-design-required', [
                        `Current dependency crosses from ${v.contextMetadata?.sourceLayer || 'one layer'} to ${v.contextMetadata?.targetLayer || 'another layer'}.`,
                        'Move the dependency behind an inner-layer interface or service boundary.',
                        'Update the outer layer to implement/adapt that boundary instead of being called directly.',
                    ])];
            default:
                if (v.code && DESIGN_PATTERN_STEPS[v.code]) {
                    return [suggestion(v, `Refactor ${violationCatalog_1.VIOLATION_DOC_BY_CODE[v.code]?.name || v.code}`, 'manual-design-required', DESIGN_PATTERN_STEPS[v.code])];
                }
                return [suggestion(v, 'Review RICA remediation guidance', 'manual-design-required', [
                        'Open the linked RICA documentation for this rule.',
                        'Use the highlighted class, method, and dependency as the starting point.',
                        'Apply the smallest refactor that restores the intended boundary.',
                    ])];
        }
    }
}
exports.FixSuggestionEngine = FixSuggestionEngine;
//# sourceMappingURL=fixSuggestionEngine.js.map