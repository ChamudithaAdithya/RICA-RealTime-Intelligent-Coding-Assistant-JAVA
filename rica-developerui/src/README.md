# Source layout

- `extension.ts` wires the extension together and registers VS Code commands.
- `analyzers/` contains the Java architecture and design-rule analyzers.
- `application/` contains use cases, AI coordination, and dependency ports.
- `core/` owns AST state, dependency graphs, violations, impact analysis, and rule metadata.
- `domain/` contains shared domain models and analyzer configuration types.
- `infrastructure/` contains Java parsing, VS Code adapters, backend integration, file watching, and AI providers.
- `ui/` contains diagnostic actions and the documentation and violations webviews.
- `tooling/` contains source-level project checks used during development.
- `test/` contains automated tests and Java fixtures.
- `apiClient.ts`, `astTypes.ts`, and `javaParser.ts` are small compatibility entry points.

Compiled JavaScript is generated in `dist/`; it does not belong in this directory.
