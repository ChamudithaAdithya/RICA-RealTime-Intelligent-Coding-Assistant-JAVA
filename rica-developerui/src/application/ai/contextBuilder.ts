import {
  AiCandidate, AiContextPayload, AiExecutionStep,
} from '../../domain/ai';
import { FullASTOutput, ClassInfo, Method } from '../../domain/astTypes';
import type { ProjectDependencyGraph } from '../../dependencyGraph';
import { hasSecurityAnnotation } from './triage';

export interface ContextBuildOptions {
  maxSteps: number;
  maxDepth: number;
  /** Total source-character budget across all source slices (token guard). */
  sourceBudgetChars: number;
  /** Steps at depth <= this get full source slices; deeper steps are signature-only. */
  fullSourceDepth: number;
  /** Lines per source slice. */
  sliceLines: number;
  /** Optional raw source reader (extension passes fs.readFileSync; tests pass fixtures). */
  readSource?: (filePath: string) => string | undefined;
}

const DEFAULT_OPTS: ContextBuildOptions = {
  maxSteps: 24,
  maxDepth: 4,
  sourceBudgetChars: 12000,
  fullSourceDepth: 1,
  sliceLines: 14,
  readSource: undefined,
};

const PRIVILEGED_VERBS = /^(create|save|update|put|post|delete|remove|transfer|approve|settle|cancel|refund|grant|revoke|reset|deactivate|activate|import|export|pay|charge|disburse|withdraw|admin)/i;

export interface ContextBuildInput {
  candidates: AiCandidate[];
  filesMap: Record<string, FullASTOutput>;
  graph: ProjectDependencyGraph;
  opts?: Partial<ContextBuildOptions>;
}

/**
 * Bounded context packaging: deterministic structural facts only.
 * Deterministic tools (AST + graph) pre-compute the execution path, auth hints
 * and privilege markers; the LLM never sees raw AST blobs or unbounded sources.
 */
export function buildContext(input: ContextBuildInput): AiContextPayload {
  const options = { ...DEFAULT_OPTS, ...(input.opts ?? {}) };
  const steps: AiExecutionStep[] = [];
  const visited = new Set<string>();
  let usedBudget = 0;

  for (const candidate of input.candidates) {
    const path = buildCandidatePath(candidate, input.filesMap, input.graph, options);
    for (const step of path) {
      if (visited.has(step.caller)) continue;
      visited.add(step.caller);
      usedBudget += step.sourceSlices.join('\n').length;
      if (usedBudget > options.sourceBudgetChars) step.sourceSlices = [];
      steps.push(step);
    }
  }

  return {
    language: 'java',
    boundary: 'controller -> service -> repository; entity/dto never cross the API boundary',
    candidates: input.candidates,
    executionPath: steps,
    riskNotes: [
      'Authentication is judged from method/class annotations only; framework-level security filters are not visible to RICA.',
      'Dynamic dispatch beyond simple-name/interface OR-branch expansion is not resolved in v1.',
    ],
  };
}

/**
 * Deterministic per-candidate execution path: the violating method plus its
 * resolved callees, depth-limited and distance-weighted (full source at depth
 * 0-1, signature-only beyond). Shared by the LLM context builder and the
 * heuristic advisor so both reason over identical facts.
 */
export function buildCandidatePath(
  candidate: AiCandidate,
  filesMap: Record<string, FullASTOutput>,
  graph: ProjectDependencyGraph,
  options?: Partial<ContextBuildOptions>,
): AiExecutionStep[] {
  const opts = { ...DEFAULT_OPTS, ...(options ?? {}) };
  const classMap = buildClassMap(filesMap);
  const located = locateMethod(filesMap, candidate);
  if (!located) return [];

  const steps: AiExecutionStep[] = [];
  const visited = new Set<string>();
  let usedBudget = 0;

  const walk = (cls: ClassInfo, ast: FullASTOutput, method: Method, depth: number): void => {
    if (depth > opts.maxDepth) return;
    const signature = methodSignature(cls, method);
    if (visited.has(signature) || steps.length >= opts.maxSteps) return;
    visited.add(signature);

    let slice = depth <= opts.fullSourceDepth ? sourceSlice(opts.readSource, ast.filePath, method) : [];
    usedBudget += slice.join('\n').length;
    if (usedBudget > opts.sourceBudgetChars) slice = [];

    const direct = resolveCalleeInfos(cls, ast, method, classMap, graph);
    const ambiguousCallees = direct.flatMap(d => d.ambiguousCallees);

    steps.push({
      caller: signature,
      file: ast.filePath,
      hasAuthAnnotation: hasSecurityAnnotation(cls.annotations) || hasSecurityAnnotation(method.annotations),
      isPrivilegedOperation: isPrivileged(method),
      calls: direct.map(d => methodSignature(d.cls, d.method)),
      ambiguousCallees,
      sourceSlices: slice,
    });

    for (const d of direct) {
      walk(d.cls, d.ast, d.method, depth + 1);
    }
  };

  walk(located.cls, located.ast, located.method, 0);
  return steps;
}

interface LocatedMethod {
  cls: ClassInfo;
  ast: FullASTOutput;
  method: Method;
}

interface ClassEntry {
  cls: ClassInfo;
  ast: FullASTOutput;
}

interface ResolvedCallee {
  cls: ClassInfo;
  ast: FullASTOutput;
  method: Method;
  /** OR-branch signatures when the receiver type matched multiple project classes. */
  ambiguousCallees: string[];
}

function resolveCalleeInfos(
  cls: ClassInfo,
  ast: FullASTOutput,
  method: Method,
  classMap: Map<string, ClassEntry>,
  graph: ProjectDependencyGraph,
): ResolvedCallee[] {
  const out: ResolvedCallee[] = [];
  for (const call of method.calledMethods || []) {
    if (call.isLibraryCall) continue;
    const base = stripGenerics(call.receiverType || call.targetClass || '').replace(/^this$/, '').trim();
    if (!base) continue;

    const typeCandidates = resolveClassFQNs(base, ast, graph);
    if (typeCandidates.length === 0) continue;

    const callName = call.targetMethod || call.calledMethodName;
    const matching = typeCandidates
      .map(fqn => classMap.get(fqn))
      .filter((e): e is ClassEntry => !!e && e.cls.methods.some(m => m.name === callName));

    if (matching.length === 0) continue;
    const nextInfo = matching[0];
    const nextMethod = nextInfo.cls.methods.find(m => m.name === callName);
    if (!nextMethod) continue;

    out.push({
      cls: nextInfo.cls,
      ast: nextInfo.ast,
      method: nextMethod,
      ambiguousCallees:
        matching.length > 1
          ? matching.map(info => {
              const m = info.cls.methods.find(x => x.name === callName);
              return m ? methodSignature(info.cls, m) : info.cls.fullyQualifiedName;
            })
          : [],
    });
  }
  return out;
}

function locateMethod(filesMap: Record<string, FullASTOutput>, c: AiCandidate): LocatedMethod | null {
  const ast = filesMap[c.filePath];
  if (!ast) return null;
  const cls = ast.classes.find(k => inClassBounds(k, c.lineNumber)) ?? ast.classes[0];
  if (!cls) return null;
  const method = cls.methods.find(m => {
    if (c.lineNumber && isInMethod(m, c.lineNumber)) return true;
    return !!c.evidence && c.evidence.endsWith(`.${m.name}`);
  });
  if (!method) return null;
  return { cls, ast, method };
}

function inClassBounds(cls: ClassInfo, line?: number): boolean {
  if (!line || !cls.startLine || !cls.endLine) return true;
  return line >= cls.startLine && line <= cls.endLine;
}

function isInMethod(m: Method, line: number): boolean {
  if (!m.startLine) return false;
  return m.endLine ? line >= m.startLine && line <= m.endLine : line >= m.startLine;
}

function isPrivileged(m: Method): boolean {
  return PRIVILEGED_VERBS.test(m.name);
}

function methodSignature(cls: ClassInfo, m: Method): string {
  const params = m.parameters?.map(p => p.dataType || 'Object').join(', ') ?? '';
  return `${cls.fullyQualifiedName}.${m.name}(${params})`;
}

function stripGenerics(t: string): string {
  return t.replace(/<.*?>/g, '').trim();
}

function sourceSlice(
  readSource: ((filePath: string) => string | undefined) | undefined,
  filePath: string,
  method: Method,
): string[] {
  if (!readSource || !method.startLine) return [];
  const text = readSource(filePath);
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const start = Math.max(0, method.startLine - 1);
  const end = method.endLine ? Math.min(lines.length, method.endLine) : start + 1;
  return lines.slice(start, end).map(l => l.slice(0, 240));
}

function buildClassMap(filesMap: Record<string, FullASTOutput>): Map<string, ClassEntry> {
  const map = new Map<string, ClassEntry>();
  for (const ast of Object.values(filesMap)) {
    for (const cls of ast.classes) {
      map.set(cls.fullyQualifiedName, { cls, ast });
    }
  }
  return map;
}

/**
 * Resolve a simple type name to known class FQNs in the project.
 * Static resolution via imports / same-package / graph lookup; ambiguous when
 * multiple classes share the simple name (the OR-branch the model must weigh).
 */
function resolveClassFQNs(
  baseName: string,
  ast: FullASTOutput,
  graph: ProjectDependencyGraph,
): string[] {
  if (baseName.includes('.')) return [baseName];

  const resolved = graph.resolveTypeFQN(baseName, ast.imports, ast.packageInfo?.name || '');
  if (resolved) return [resolved];

  const bySimpleName = graph.findNodesBySimpleName(baseName).map(n => n.id);
  return bySimpleName.length > 0 ? bySimpleName : [];
}
