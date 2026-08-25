# Static Analysis Basics

Static analysis inspects source code without running the program.

RICA reads Java files, extracts structure, and checks for patterns that usually indicate architecture or design problems.

## What RICA Can See

RICA can inspect:

- packages and imports
- class names and annotations
- method declarations
- fields and constructor dependencies
- method calls
- `new` expressions
- common framework types
- dependency graph edges

## What RICA Cannot Perfectly Know

Static analysis cannot always know runtime behavior.

Examples:

- dependency injection may happen through configuration not visible in the file
- reflection may create hidden calls
- framework conventions may wire code dynamically
- a package name may not match the actual intended layer
- a test fixture may intentionally violate production rules

## Why Some Rules Are Heuristic

A heuristic is a practical detection rule based on strong signals. It is not mathematical proof.

For example, a controller method with many loops and branches is a strong signal for business logic in the wrong layer, but the analyzer still needs thresholds and context.

## Related RICA Rules

All RICA rules use static analysis. Graph and design-pattern rules are especially heuristic because they infer design intent from code shape.

## Practical Fix Rule

Treat RICA findings as architecture evidence. Confirm the code context, then either refactor the code or tune the rule configuration.

