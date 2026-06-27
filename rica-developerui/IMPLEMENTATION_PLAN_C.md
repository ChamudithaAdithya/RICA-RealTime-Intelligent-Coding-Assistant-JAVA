# Implementation Plan C — Rich Architectural Violation Messages

**Goal:** Transform every RICA diagnostic from a cryptic rule-code into a self-contained, actionable teaching moment inside the IDE.

---

## 1. Current State — What's Broken

Every violation today tells the developer *what* broke but not *how to fix it*.

| Current Message | Developer's Reaction |
|---|---|
| `Controller method 'getResourceResponseEntity' performs file I/O via 'Files'.` | "I know it's file I/O. WHERE should it go instead?" |
| `API resource method 'assignEmailCount' parameter 'eventIds' lacks validation annotations.` | "It has `@NotEmpty` — does RICA not see it?" (parser bug) |
| `Layer 'presentation' should not depend on layer 'service'.` | "But Spring Boot controllers call services everywhere — what's the alternative?" |

The message tells the developer the *violation* but not the *solution*. They leave the IDE to Google the rule or read RICA docs. That kills flow.

---

## 2. Target State — The 5-Part Message Blueprint

Every violation must answer five questions in a single hover tooltip:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🚨 RICA-V111  Architectural Deviation                          │
│                                                                │
│ 🧱 Broken Boundary Contract                                    │
│ Controller ❌──> File System (I/O)                              │
│                                                                │
│ ⚠️ What the Issue Is                                           │
│ Controllers must be stateless delivery mechanisms. Direct      │
│ file I/O couples the web layer to the host OS environment,     │
│ breaking cloud portability and testability.                    │
│                                                                │
│ 💡 Recommended Refactoring                                     │
│ 1. Define an output port interface in application/ports/       │
│    (e.g. ReportStoragePort.persistReportLog(content))          │
│ 2. Implement the adapter in infrastructure/                    │
│ 3. Inject the port into the controller                         │
│ 4. Delegate the file operation to the port                     │
│                                                                │
│ 🛠️ Before vs After                                             │
│ ❌ Before (your code):                                          │
│    Files.writeString(Path.of("out.txt"), data);                │
│                                                                │
│ ✅ After (recommended):                                        │
│    reportStoragePort.persistReportLog(data);                   │
│                                                                │
│ 🔗 docs.rica.dev/rules/V111                                   │
└─────────────────────────────────────────────────────────────────┘
```

### The Five Sections

| # | Section | Purpose | Source |
|---|---|---|---|
| 1 | **Broken Boundary Contract** | Visual arrow showing which layers were crossed | Rule metadata |
| 2 | **What the Issue Is** | Architectural rationale in plain language | Rule metadata |
| 3 | **Recommended Refactoring** | Step-by-step instructions | Rule metadata |
| 4 | **Before vs After** | Exact offending code side-by-side with fix template | Parser + Rule metadata |
| 5 | **Documentation Link** | Deep link to full rule reference | Rule config |

---

## 3. Data Model Changes

### New: `RichViolation` interface

```typescript
// src/domain/violations.ts

export interface RichViolation extends Violation {
  /** The exact source line(s) that triggered the violation */
  offendingCode: string;

  /** Machine-readable boundary contract (e.g. "controller→filesystem") */
  brokenContract: {
    source: string;          // e.g. "Controller / Presentation"
    target: string;          // e.g. "File System (I/O)"
    direction: 'direct' | 'indirect';
  };

  /** Human-readable explanation of why the rule exists */
  rationale: string;

  /** Ordered list of steps to resolve */
  refactoringSteps: string[];

  /** Code template showing the BAD pattern (user's actual code) */
  beforeCode: string;

  /** Code template showing the FIXED pattern */
  afterCode: string;

  /** Optional deep link to rule documentation */
  docUrl?: string;
}
```

### Extended: `Violation` (base)

```typescript
export interface Violation {
  // ... existing fields ...
  
  /** New optional fields — detectors populate what they can */
  offendingCode?: string;
  brokenContract?: { source: string; target: string; direction: string };
  rationale?: string;
  refactoringSteps?: string[];
  beforeCode?: string;
  afterCode?: string;
  docUrl?: string;
}
```

This keeps backward compatibility — existing consumers see `undefined` for fields they don't use.

---

## 4. Parser Changes

### 4a. Capture Source Lines

The parser already stores `startLine`/`endLine` on methods, calls, and creations. We need to add **source text capture**:

```typescript
// src/infrastructure/javaParser.ts

export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  /** The raw source text at this location */
  sourceText: string;
}

// Add to Method, MethodCall, ObjectCreation, etc.
sourceLocation?: SourceLocation;
```

Populate `sourceText` by slicing the original source buffer using the `startLine`/`endLine`/`startColumn`/`endColumn` that the parser already computes. This avoids storing the entire source in every node — just the relevant snippet.

### 4b. Expose Full Source in AST Output

```typescript
// src/domain/astTypes.ts

export interface FullASTOutput {
  // ... existing fields ...
  
  /** The complete raw source code of the file */
  sourceCode?: string;
}
```

Set `sourceCode` once at parse time. Detectors use this to extract context around violations.

---

## 5. Detector Changes — Per-Rule Metadata Registry

Each rule (V110–V114, V201–V207, V401–V404, V501) gets a metadata record:

```typescript
// src/domain/ruleMetadata.ts

export interface RuleMetadata {
  code: string;                    // "RICA-V111"
  name: string;                    // "File I/O in Controller"
  severity: 'error' | 'warning' | 'info';
  boundaryContract: {
    source: string;                // "Controller / Presentation"
    target: string;                // "File System (I/O)"
    direction: 'direct' | 'indirect';
  };
  rationale: string;               // Why this rule exists
  refactoringSteps: string[];      // Generic steps
  afterCodeTemplate: string;       // Generic fix template
  docUrl: string;                  // Link to full documentation
}

export const RULE_METADATA: Record<string, RuleMetadata> = {
  'RICA-V111': {
    code: 'RICA-V111',
    name: 'File I/O in Controller',
    severity: 'error',
    boundaryContract: {
      source: 'Controller / Presentation',
      target: 'File System (I/O)',
      direction: 'direct',
    },
    rationale: 'Controllers must be stateless delivery mechanisms. '
      + 'Direct file I/O couples the web layer to the host OS, breaking '
      + 'cloud portability and making unit tests depend on the filesystem.',
    refactoringSteps: [
      'Define an output port interface in `application/ports/` '
        + '(e.g. `ReportStoragePort.persistReportLog(content)`)',
      'Implement the adapter in `infrastructure/`',
      'Inject the port interface into the controller constructor',
      'Replace the direct `Files` call with a delegation to the port',
    ],
    afterCodeTemplate: [
      '// Port interface (application/ports/)',
      'public interface ReportStoragePort {',
      '    void persistReportLog(String content);',
      '}',
      '',
      '// Controller (presentation/controllers/)',
      '@RestController',
      'public class MyController {',
      '    private final ReportStoragePort storage;',
      '    public MyController(ReportStoragePort storage) {',
      '        this.storage = storage;',
      '    }',
      '',
      '    public void handle() {',
      '        storage.persistReportLog(data);   // ✅ clean delegation',
      '    }',
      '}',
    ].join('\n'),
    docUrl: 'https://docs.rica.dev/rules/V111',
  },
  // ... every other rule ...
};
```

### Detector Integration

When a detector finds a violation, it merges the rule metadata with the runtime context:

```typescript
// Inside controllerLayerDetector.ts

private buildRichViolation(
  base: ControllerLayerViolation,
  ruleCode: string,
  fileAst: FullASTOutput
): Violation {
  const meta = RULE_METADATA[ruleCode];
  return {
    ...layerViolationToUnified(base, 'ControllerLayer'),
    offendingCode: this.extractSourceLine(fileAst.sourceCode, base.lineNumber),
    brokenContract: meta.boundaryContract,
    rationale: meta.rationale,
    refactoringSteps: meta.refactoringSteps,
    beforeCode: this.extractSourceLine(fileAst.sourceCode, base.lineNumber),
    afterCode: meta.afterCodeTemplate,
    docUrl: meta.docUrl,
  };
}
```

---

## 6. Diagnostic Reporter — Markdown Rendering

### 6a. New Renderer

```typescript
// src/infrastructure/richDiagnosticRenderer.ts

export function renderRichViolation(v: Violation): string {
  const parts: string[] = [];

  // Title
  parts.push(`🚨 **${v.code}** ${v.ruleName}`);

  // Boundary contract
  if (v.brokenContract) {
    parts.push('');
    parts.push('---');
    parts.push('**🧱 Broken Boundary Contract**');
    parts.push(
      `\`${v.brokenContract.source}\` ❌──> \`${v.brokenContract.target}\``
    );
  }

  // Rationale
  if (v.rationale) {
    parts.push('');
    parts.push('**⚠️ What the Issue Is**');
    parts.push(v.rationale);
  }

  // Offending code
  if (v.offendingCode) {
    parts.push('');
    parts.push('**❌ Offending Code**');
    parts.push('```java');
    parts.push(v.offendingCode);
    parts.push('```');
  }

  // Refactoring steps
  if (v.refactoringSteps && v.refactoringSteps.length > 0) {
    parts.push('');
    parts.push('**💡 Recommended Refactoring**');
    v.refactoringSteps.forEach((step, i) => {
      parts.push(`${i + 1}. ${step}`);
    });
  }

  // After code
  if (v.afterCode) {
    parts.push('');
    parts.push('**✅ Recommended Structure**');
    parts.push('```java');
    parts.push(v.afterCode);
    parts.push('```');
  }

  // Doc link
  if (v.docUrl) {
    parts.push('');
    parts.push(`🔗 ${v.docUrl}`);
  }

  return parts.join('\n');
}
```

### 6b. Integrate into `vscodeDiagnosticReporter.ts`

```typescript
// In the diagnostic creation loop
const diagnostic = new vscode.Diagnostic(
  range,
  renderRichViolation(violation),  // ← full Markdown message
  severityMap[violation.severity]
);
diagnostic.code = violation.code;
```

VS Code's hover for diagnostics automatically renders Markdown, so `**bold**`, code fences, and bullet lists all work.

---

## 7. Implementation Phases

### Phase 1 — Rule Metadata Registry (Days 1-2)

- [ ] Create `src/domain/ruleMetadata.ts` with metadata for all rules
- [ ] Write metadata for all 15+ rules (V110–V114, V201–V207, V401–V404, V501)
- [ ] Unit test: every rule has non-empty `rationale`, `refactoringSteps`, `afterCodeTemplate`

### Phase 2 — Source Line Capture (Days 3-4)

- [ ] Add `sourceCode` field to `FullASTOutput`
- [ ] Populate it in `JavaParser.parse()`
- [ ] Add helper `extractSourceLine(sourceCode, lineNumber): string` to extract the offending line
- [ ] Unit test: parsed AST has correct `sourceCode`; line extraction works for single and multi-line statements

### Phase 3 — Detector Integration (Days 5-8)

- [ ] Extend `Violation` base interface with optional rich fields
- [ ] Update `ControllerLayerAnalyzer` to produce rich violations
- [ ] Update `APIResourceLayerAnalyzer`
- [ ] Update `ServiceLayerAnalyzer`
- [ ] Update `EntityLayerAnalyzer`
- [ ] Update `CrossFileAnalyzer` (V401–V404)
- [ ] Update `PackageBoundaryAnalyzer` (V501)
- [ ] Update `ViolationManager.layerViolationToUnified()` to merge rule metadata

### Phase 4 — Diagnostic Rendering (Days 9-10)

- [ ] Create `RichDiagnosticRenderer` with full Markdown output
- [ ] Integrate into `vscodeDiagnosticReporter.ts`
- [ ] Test hover tooltips in VS Code

### Phase 5 — Polish & Edge Cases (Days 11-12)

- [ ] Handle multi-line offending code (show full method body context)
- [ ] Add `beforeCode` that includes 1-2 lines of context around the violation
- [ ] Verify backward compatibility: old consumers that read `message` field still get meaningful text
- [ ] Verify diagnostic rendering in VS Code, VS Codium, and Theia

---

## 8. Testing Strategy

### New Tests

| Test | What it Verifies |
|---|---|
| `ruleMetadata completeness` | Every `RULE_CODE_MAP` entry has a corresponding `RULE_METADATA` entry |
| `ruleMetadata non-empty` | Every metadata record has non-empty `rationale`, `refactoringSteps`, `afterCode` |
| `sourceLine extraction` | `extractSourceLine` returns correct text for line number boundary cases |
| `richViolation rendering` | `renderRichViolation` produces valid Markdown for every rule |
| `backward compat` | Old `Violation` consumers work unchanged (new fields are optional) |
| `beforeCode matches offending line` | `beforeCode` is a prefix of `offendingCode` for sample violations |

### Updated Existing Tests

- All detector tests must still pass (rich fields are additive, not breaking)
- The `layerViolationToUnified` tests should verify that metadata is merged correctly

---

## 9. Backward Compatibility

| Concern | Mitigation |
|---|---|
| Old code reads `Violation.message` | `message` is still populated with the summary string |
| Old code reads `Violation.code` | `code` is unchanged |
| Old diagnostic reporter uses `message` directly | Old path untouched; new `renderRichViolation` used in parallel |
| 3rd party tools consume RICA JSON output | Rich fields are optional; JSON schema unchanged |

---

## 10. Summary of Deliverables

| Deliverable | Files |
|---|---|
| Rule metadata registry | `src/domain/ruleMetadata.ts` |
| Source code capture | `src/infrastructure/javaParser.ts` (modify parse) |
| Extended violation struct | `src/domain/violations.ts` (extend) |
| Rich violation builder | `src/domain/richViolationBuilder.ts` |
| Markdown renderer | `src/infrastructure/richDiagnosticRenderer.ts` |
| Updated detectors (x6) | `controllerLayerDetector.ts`, `apiResourceLayerDetector.ts`, `serviceLayerDetector.ts`, `entityLayerDetector.ts`, `crossFileAnalyzer.ts`, `packageBoundaryDetector.ts` |
| Updated reporter | `src/infrastructure/vscodeDiagnosticReporter.ts` |
| Tests | `src/test/ruleMetadata.test.ts`, `src/test/richViolation.test.ts` |
