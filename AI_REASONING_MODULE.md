# RICA AI Reasoning Module — Example Input / Output & End-to-End Workflow

> **Advisory, context-aware decision component** (proposal Sections 5 & 7.2).
> This document describes how the module will interact with RICA's existing
> deterministic pipeline (`rica-developerui/src`). The AI module is **optional,
> non-blocking, and advisory-only** — rule-based analysis is never gated on it.

---

## 1. Where the module sits in the pipeline

```
 ┌─ Trigger ─────────────────────────────────────────────────────────────────┐
 │  file save  →  FileWatcher.onDocumentSaved() → ViolationManager.onFileSaved()│
 │  full scan  →  rica.analyzeProject        → ViolationManager.update()       │
 └──────────────┬──────────────────────────────────────────────────────────────┘
                ▼
 ┌─ Deterministic stages (fast, always run) ──────────────────────────────────┐
 │ Stage 1  Layer detectors     V101–V114, V201–V207   (all 4 analyzers)      │
 │ Stage 2  Cross-file graph    V401–V404             (dependencyGraph)       │
 │ Stage 3  Package boundary    V501                  (packageBoundaryDetector)│
 │ Stage 4  Design patterns     V301–V307             (designPatternAnalyzer) │
 │          →  activeViolations[]   (synchronous, awaited)                     │
 └──────────────┬──────────────────────────────────────────────────────────────┘
                ▼
 ┌─ AI advisory stage (optional, async, fire-and-forget) ────────────────────┐
 │ 1. Triage          select low-confidence / ambiguous / "no rule matched"   │
 │                    candidates                                               │
 │ 2. Context packer  slice AST + call-chain + graph into a bounded payload    │
 │ 3. LLM call        aiDecisionProvider.evaluate(context)  (local or API)     │
 │ 4. Merge           decisions → Violation.quickFix / .aiInsights             │
 │ 5. Audit           JSONL log of request + response (privacy ledger)         │
 │ 6. Re-render       refreshDiagnostics() pushes guidance into the IDE        │
 └──────────────────────────────────────────────────────────────────────────────┘
                ▼
             Violations panel / diagnostics / code actions
```

Steps **1–4** never wait on the AI module; step **3** resolves in the background
and its result is merged in later.

---

## 2. Worked example (the case static rules cannot fully resolve)

`src/main/java/com/example/presentation/OrderResource.java`

```java
@RestController
public class OrderResource {

    @Autowired
    private OrderService orderService;

    @PostMapping("/orders")
    public OrderSaveResult placeOrder(@RequestBody OrderRequest req) {
        orderService.placeOrder(req);          // line 8
        return orderService.getResult();        // line 9
    }
}
```

**What the deterministic stages see:**

| Stage | Outcome |
|---|---|
| Stage 1 — `APIResourceLayerAnalyzer` | `OrderRequest` is recognised as a DTO (suffix `Request`) → **no V202**. `OrderSaveResult` does **not** end in `DTO/VO/Request/Response` and is not `@Entity` → `V207` *might* fire, but with low confidence (it is an application-layer type). |
| Stage 1 — injection | `orderService` is `@Autowired` → clean. |
| Stage 2 / 3 / 4 | No graph, boundary, or pattern rule fires. |

Result: the deterministic layer is **uncertain** about `OrderSaveResult`, and it
can say **nothing at all** about whether `placeOrder` is authorized — the missing
authorization check is a *semantic* gap no pure-static rule can deduce.

This is exactly the case the *AI Reasoning Module* is designed for: an ambiguity
(**partial match**) plus a **no-rule-matches** semantic anomaly.

---

## 3. Step-by-step workflow

### Step 1 — Trigger
User saves `OrderResource.java` (or picks `rica.analyzeProject`).
`ViolationManager.update()` / `onFileSaved()` runs the four deterministic stages
and produces `activeViolations`. Everything downstream of this point is **async**.

### Step 2 — Triage (fully deterministic)
The advisory coordinator filters candidates:

1. **Low-confidence rule hits** — e.g. `V207` on `OrderSaveResult` where
   `layerClassification.confidenceScore < threshold` (the parser already records
   `confidenceScore` + `heuristicsMatched` per class, `javaParser.ts:3513`).
2. **Ambiguity markers** — return/param types that are neither clear DTOs nor
   clear Entities.
3. **Semantic gap probes** — endpoint methods in the `presentation` layer that
   mutate state (a `POST`/`PUT`/`DELETE` handler calling a `Service` method)
   where no authorization-related annotation exists. This is a *probe*, not a
   violation — its resolution is delegated entirely to the LLM.

Only the matched candidates move on; a healthy codebase typically yields a small
batch, and there is a hard per-run cap (e.g. 8 candidates, configurable).

### Step 3 — Context packaging
For each candidate, the packer builds a bounded JSON payload from the data RICA
already produces (`domain/astTypes.ts`, `projectDependencyGraph`):

- The **method** (`Method`: signature, annotations, parameters, return type,
  `body`, `complexityMetrics`)
- The **calls** it makes (`calledMethods[]`, `createdObjects[]`) with injection
  metadata
- The **interprocedural chain** — the `Service` methods invoked, their return
  types, and referenced types
- The **related symbols** — resolved `ClassInfo` for `OrderSaveResult`,
  `OrderRequest`, `OrderService` (from `classMap`/`simpleNameMap`)
- A tiny **graph slice** — inbound/outbound edges for the involved classes

Payload size is budget-capped (token limit setting) so it fits a small local LLM
context window. See the full example in **§4**.

### Step 4 — LLM evaluation (the only non-deterministic hop)
The payload is handed to `AiDecisionProvider` (port) → concrete adapter:

- `OllamaAiAdapter` / `LlamaCppAiAdapter` → local HTTP inference
- `OpenAICompatibleAdapter` → API inference (same request shape)

The prompt instructs the model to return a **strict JSON schema** (verdict +
confidence + explanations + optional quick-fix). Output arrives as shown in **§5**.

If the adapter is unreachable, times out, or returns malformed JSON →
**graceful fallback**: the module logs the failure and contributes **nothing**.
Core analysis and existing violations are untouched.

### Step 5 — Merge, guidance, and quick fix
`ViolationManager` merges each decision:

- `resolvedAmbiguity` → the low-confidence `V207` is confirmed or suppressed.
  Because the module is advisory, a "verified" ambiguity still renders the
  existing deterministic violation unless the rule itself is suppressed by the
  developer — the AI only *annotates*, it never *deletes*.
- `semanticFindings` → a **new** advisory `Violation` (detectorSource
  `'AiAdvisory'`), carrying:
  - `explanation` + `mitigationHint` (human-readable guidance)
  - `relatedInformation` (cross-file trace back to `OrderService.placeOrder`)
  - `quickFix` (e.g. insert `@PreAuthorize(...)` at `OrderResource.java:8`)
- A VS Code **CodeActionProvider** turns `quickFix` into a real apply-able edit
  ("Add @PreAuthorize guard") from the diagnostics/code-lens and the violations
  panel.

### Step 6 — Refresh
`refreshDiagnostics()` re-renders the merged violations into the editor
diagnostics and the webview. The user sees the AI finding next to (never instead
of) the deterministic ones.

### Step 7 — Audit logging
Every request and response is appended to a rotating JSONL ledger
(`ai-audit-YYYYMMDD.jsonl`) with the `requestId`, model, token counts, and the
truncated prompt. This provides the privacy/transparency trail required by the
proposal: *what code left the machine, what the model said, and on what basis*.
Nothing is logged or transmitted unless `enableAiAdvisory` is `true`.

---

## 4. Example INPUT — the context payload (what leaves the machine)

```json
{
  "requestId": "ai-8f3a-20260816-104211",
  "config": { "model": "ollama:llama3.1:8b", "mode": "advisory" },
  "project": { "name": "shop", "filesScanned": 312 },
  "candidates": [
    {
      "id": "amb-01",
      "kind": "ambiguous-rule",
      "ruleCode": "RICA-V207",
      "reason": "Return type matches neither DTO nor Entity naming — partial match",
      "asset": {
        "filePath": "src/main/java/com/example/presentation/OrderResource.java",
        "className": "OrderResource",
        "detectedLayer": "controller",
        "annotations": ["RestController"],
        "fields": [ { "name": "orderService", "dataType": "OrderService", "isInjected": true } ]
      },
      "method": {
        "name": "placeOrder",
        "accessModifier": "public",
        "httpVerb": "POST",
        "parameters": [ { "name": "req", "dataType": "OrderRequest", "annotations": ["RequestBody"] } ],
        "returnType": "OrderSaveResult",
        "calledMethods": [
          { "calledMethodName": "placeOrder", "targetClass": "OrderService",
            "receiverVariableName": "orderService", "receiverIsInjected": true, "arguments": ["req"] },
          { "calledMethodName": "getResult", "targetClass": "OrderService",
            "receiverVariableName": "orderService", "receiverIsInjected": true }
        ],
        "body": { "linesOfCode": 4, "cyclomaticComplexity": 1 }
      },
      "callChain": [
        { "targetClass": "OrderService", "method": "placeOrder", "effect": "mutates order state" },
        { "targetClass": "OrderService", "method": "getResult", "returnType": "OrderSaveResult" }
      ],
      "relatedSymbols": [
        { "name": "OrderSaveResult", "fqcn": "com.example.application.dto.OrderSaveResult",
          "annotations": [], "methods": [ "getOrderNumber", "getStatus" ] },
        { "name": "OrderRequest", "fqcn": "com.example.presentation.dto.OrderRequest",
          "typeHint": "dto", "annotations": [] }
      ],
      "graph": {
        "incoming": { "OrderSaveResult": [ "OrderService", "OrderResource" ] },
        "outgoing": { "OrderResource": [ "OrderService" ] }
      },
      "authorizationProbe": {
        "endpoint": "/orders",
        "mutatesState": true,
        "authAnnotationsFound": []
      }
    }
  ]
}
```

> Privacy note: this payload is the **minimum** bundle needed for reasoning —
> trimmed AST, no unrelated files, no comments/javadoc unless required by the prompt.

---

## 5. Example OUTPUT — the AI decision

```json
{
  "requestId": "ai-8f3a-20260816-104211",
  "model": "llama3.1:8b",
  "durationMs": 1240,
  "tokensUsed": { "prompt": 1483, "completion": 212 },
  "decision": {
    "resolvedAmbiguity": {
      "candidateId": "amb-01",
      "ruleCode": "RICA-V207",
      "outcome": "NO_VIOLATION",
      "confidence": 0.86,
      "rationale": "OrderSaveResult is an application-layer value object (fields-only, no behavior, no persistence mapping). Treating it as a DTO is acceptable."
    },
    "semanticFindings": [
      {
        "type": "missing-authorization-check",
        "severity": "warning",
        "confidence": 0.9,
        "summary": "POST /orders mutates order state via OrderService.placeOrder but the handler has no authorization guard.",
        "explanation": "Any authenticated (or unauthenticated) caller can place an order. Authorization is currently neither enforced at the endpoint (@PreAuthorize) nor delegated inside OrderService by inspecting the authenticated principal.",
        "mitigationHint": "Guard the endpoint with @PreAuthorize(\"hasRole('BUYER')\") or enforce the check inside OrderService against the current SecurityContext.",
        "quickFix": {
          "kind": "insert-annotation",
          "title": "Add @PreAuthorize guard",
          "filePath": "src/main/java/com/example/presentation/OrderResource.java",
          "line": 10,
          "code": "@PreAuthorize(\"hasRole('BUYER')\")"
        },
        "relatedInformation": [
          { "filePath": "src/main/java/com/example/service/OrderService.java", "method": "placeOrder" }
        ]
      }
    ]
  }
}
```

**How this maps into `Violation`** (existing `domain/violations.ts` + new fields):

```jsonc
{
  "id": "AiAdvisory-OrderResource-placeOrder-missing-auth-…",
  "code": "RICA-V000",                   // advisory findings have no rule code
  "ruleName": "AI advisory: missing authorization check",
  "detectorSource": "AiAdvisory",        // new detectorSource value
  "severity": "warning",                 // determinant wins; advisory annotates
  "filePath": "src/main/java/com/example/presentation/OrderResource.java",
  "lineNumber": 8,
  "explanation": "…enforced neither at the endpoint…",   // AI explanation
  "mitigationHint": "…@PreAuthorize…",                    // AI guidance
  "relatedInformation": [ { "filePath": "…/OrderService.java", "message": "mutates order state" } ],
  "contextMetadata": { "aiModel": "llama3.1:8b", "requestId": "ai-8f3a-…", "aiConfidence": 0.9 },
  "quickFix": { "kind": "insert-annotation", "title": "Add @PreAuthorize guard",
                "edit": { "filePath": "…", "line": 10, "text": "@PreAuthorize(\"hasRole('BUYER')\")" } }
}
```

The existing **Ignore/Unignore** machinery in `ViolationsWebviewPanel` already
applies; an advisory finding can be dismissed exactly like a rule-based one.

---

## 6. Audit log line (Step 7)

`ai-audit-20260816.jsonl`

```json
{"ts":"2026-08-16T10:42:11.312Z","requestId":"ai-8f3a-…","model":"ollama:llama3.1:8b",
 "candidates":1,"promptTokens":1483,"completionTokens":212,
 "promptHash":"sha256:9d2f…","decision":"NO_VIOLATION(V207) + missing-authorization-check(0.9)",
 "filesReferenced":["OrderResource.java","OrderService.java","OrderSaveResult"],"error":null}
```

---

## 7. Failure / fallback matrix

| Scenario | Behavior |
|---|---|
| `enableAiAdvisory = false` | Module skipped entirely; pipeline identical to today |
| Local model not running / API down | Adapter returns error → logged → **no** advisory findings |
| Request > 30s timeout | Request aborted, logged, skipped |
| Malformed / non-schema JSON response | Discarded + logged; never crashes the extension |
| LLM says "verify V207" but rule already emitted | Existing violation stays (advisory annotates, never deletes) |
| Token budget exceeded | Context packer truncates to allowed size and logs truncation |

---

## 8. Config additions (mirrors existing gates)

```jsonc
// contributes.configuration → javaAstAnalyzer
{
  "enableAiAdvisory":               { "type": "boolean", "default": false },
  "aiProvider":                     { "type": "string",  "default": "ollama",
                                     "enum": ["off", "ollama", "openai-compatible"] },
  "aiEndpoint":                     { "type": "string",  "default": "http://localhost:11434" },
  "aiModel":                        { "type": "string",  "default": "qwen2.5-coder:7b" },
  "aiMaxTokensPerRequest":          { "type": "number",  "default": 2000 },
  "aiTimeoutMs":                    { "type": "number",  "default": 30000 },
  "aiMaxCandidatesPerRun":          { "type": "number",  "default": 8 },
  "aiTrigger":                      { "type": "string",  "default": "onDemand",
                                     "enum": ["onDemand", "onSave", "onFullScan"] },
  "aiAuditLogEnabled":              { "type": "boolean", "default": true }
}
```

`AnalyzerConfig` gains a nested `ai: AiConfig` field, `VscodeConfigProvider` reads the
keys, and the existing `onDidChangeConfiguration` handler in `extension.ts` rebuilds the
AI coordinator and re-flags the pipeline — the same wiring already used by
`enableDesignPatternChecks`.

---

## 9. Implementation status (M0–M8 plan)

| Milestone | Scope | Status |
|---|---|---|
| M0 | Config surface (`AiConfig`, `package.json` contributions, `VscodeConfigProvider`) | ✅ shipped |
| M1 | Domain types (`src/domain/ai.ts`), `Violation` extended (`aiInsights`, `quickFix`, `detectorSource: 'AiAdvisory'`) | ✅ shipped |
| M2 | Ports `AiDecisionProvider` + `AiAuditLogger` | ✅ shipped |
| M3 | Adapters `OllamaAiAdapter`, `OpenAICompatibleAiAdapter`, `FileAuditLogger`, HTTP/parse/prompt helpers | ✅ shipped |
| M4 | `triage.ts`, `contextBuilder.ts`, `heuristicAdvisor.ts` | ✅ shipped |
| M5 | `AiAdvisoryCoordinator`, ViolationManager advisory channel, extension wiring + `rica.aiReview` command | ✅ shipped |
| M6 | UI: quick-fix code action, advisory markers in diagnostics/webview | pending (follow-up) |
| M7 | Tests (fixture-based, mock provider) | ✅ shipped — 88 passing |
| M8 | Docs (this file) | ✅ this update |

**Shipped files added by the implementation**

```
rica-developerui/src/domain/ai.ts
rica-developerui/src/application/ports/aiDecisionProvider.ts
rica-developerui/src/application/ports/aiAuditLogger.ts
rica-developerui/src/application/ai/triage.ts
rica-developerui/src/application/ai/contextBuilder.ts
rica-developerui/src/application/ai/heuristicAdvisor.ts
rica-developerui/src/application/ai/aiAdvisoryCoordinator.ts
rica-developerui/src/infrastructure/ai/httpJson.ts
rica-developerui/src/infrastructure/ai/prompt.ts
rica-developerui/src/infrastructure/ai/parseDecisions.ts
rica-developerui/src/infrastructure/ai/ollamaAiAdapter.ts
rica-developerui/src/infrastructure/ai/openaiCompatibleAiAdapter.ts
rica-developerui/src/infrastructure/ai/fileAuditLogger.ts
rica-developerui/src/test/aiAdvisory.test.js
rica-developerui/src/test/mocks/mockAiDecisionProvider.js
```

**Decisions locked during implementation**

- Default provider `ollama`, endpoint configurable to the Colab tunnel; default model
  `qwen2.5-coder:7b` (fits a Colab T4 GPU; swap the tag freely in settings).
- Default trigger `onDemand` (manual `rica.aiReview`); `onSave` / `onFullScan` also available.
- `aiProvider === 'off'` or `enableAiAdvisory === false` ⇒ run is a strict no-op (today's
  pipeline, byte-identical).
- Heuristic advisor (Option C) runs on **every** advisory pass before the LLM; it works
  fully offline and is what annotates when the Colab instance is unreachable.
- Advisory Non-Deletion Principle enforced in `merge()`: annotations are attached to the
  same `Violation` object references; net-new probe findings become `detectorSource:
  'AiAdvisory'` violations coded `RICA-V000` — `RICA_VIOLATION_LIST.md` stays untouched.

**Remaining (M6 follow-up)**: code-action provider applying `quickFix.edits`, a distinct
`RICA-AI` marker in diagnostics, advisory rows in the violations webview, and the
ambiguity "reviewed/ok" rendering decision.