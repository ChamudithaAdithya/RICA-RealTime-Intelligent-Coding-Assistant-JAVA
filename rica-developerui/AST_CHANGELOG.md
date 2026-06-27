# AST Output Customization Guide

This document describes where to change the AST content and shape in the `rica-developerui` extension.

## 1. Main AST source: `src/javaParser.ts`

### What this file does
- Uses `java-parser` to get a Concrete Syntax Tree (CST)
- Converts CST into a simplified AST via `cstToAst`
- Extracts:
  - package declarations
  - imports
  - type declarations (class/interface/enum/record)
  - class body members, methods, fields, constructors
  - modifiers, type names, parameters, throws
  - locations (line/column)
- Keeps raw CST in `ast.rawCst` for debugging

### Where to change for AST shape/content
- `parse(sourceCode, filePath)` -> error handling output when parse fails
- `cstToAst(cst, filePath)` -> top-level AST structure and keys
- `extractPackage`, `extractImport`, `extractTypeDeclaration`, `extractClassDeclaration`, `extractInterfaceDeclaration`
- `extractClassBody`, `extractClassBodyDeclaration`, `extractFieldDeclaration`, `extractMethodDeclaration`, `extractConstructorDeclaration`, etc.
- helper methods control what data is included:
  - `extractModifiers`
  - `extractTypeString` / `collectTypeIdentifiers*`
  - `extractParameters` / `extractParamList`
  - `collectIdentifiers` / `getIdentifierName`
  - `getLocation`
- `simplifyNode` controls the raw CST serialization; adjust if you want less or more raw detail.

## 2. AST file-level handling: `src/astManager.ts`

### What this file does
- Reads Java files
- Calls `javaParser.parse()` for each file
- Caches ASTs in `fileASTCache`
- Counts nodes via `countNodes`
- Sends AST data to backend via `apiClient` (full or change events)
- Handles file watcher events (created, changed, deleted, renamed)

### Where to change for output
- `analyzeFullProject()` and `analyzeFile()`: affect what gets sent to backend and the shape of payloads
- `files[relativePath] = ast`: if you want a wrapper or extra metadata, update here
- error path fallback AST object in `analyzeFullProject()`

## 3. Backend/API transfer: `src/apiClient.ts`

### What this file does
- `sendFullAST(projectName, workspacePath, files)` -> `POST /ast/full`
- `sendFileChange(...)` -> `POST /ast/change`
- `getFileAST`, `getStats` etc.

### Where to change for payload format
- In this repo, payload normalization is here; if receiver expects a different format, modify these methods.

## 4. Change path for AST behavior

1. Modify AST shape in `src/javaParser.ts` (recommended) for full semantic content changes.
2. Update `src/astManager.ts` when you only need to transform/augment results before they are sent/stored.
3. Adjust API payload contract in `src/apiClient.ts` if backend side expects a different JSON schema.

## 5. Validation + testing

- After changes, run:
  - `npm run compile`
  - (optionally) extension tests in `src/test/extension.test.ts`
- Open VS Code Extension Host (`F5`) and verify AST-based features reflect your changes.

## 6. Pro tip
- Keep the `CompilationUnit` node stable when possible because other code may rely on `ast.types`, `ast.imports`, and `ast.package`.
- Add debug logs in `javaParser` and check output channel for parse problems.

---

### Quick pointer for your question
- "Change what I get from AST" = edit `src/javaParser.ts` first.
- If you just want to change traffic/shape to backend = `src/astManager.ts` + `src/apiClient.ts`.
