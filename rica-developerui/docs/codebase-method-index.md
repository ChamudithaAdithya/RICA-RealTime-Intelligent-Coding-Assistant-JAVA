# RICA Codebase Method Index

This file is generated from the repository source. It lists real TypeScript source files and hand-written JavaScript test files, with line counts and detected declarations. Use it together with `docs/codebase-understanding.md`.

Generated JavaScript files are listed separately at the end because they are compiled output from TypeScript, not the implementation you normally explain in defence.

## src/apiClient.ts

Type: TypeScript source  
Lines: 3

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/apiResourceLayerDetector.ts

Type: TypeScript source  
Lines: 547

| Line | Declaration |
|---:|---|
| 5 | `export interface APIResourceLayerViolation {` |
| 19 | `export class APIResourceLayerAnalyzer {` |
| 50 | `setBusinessLogicThreshold(value: number): void {` |
| 54 | `analyze(astOutputs: FullASTOutput[]): APIResourceLayerViolation[] {` |
| 61 | `for (const ast of astOutputs) {` |
| 62 | `for (const cls of ast.classes) {` |
| 64 | `if (!this.isApiResourceClass(cls)) {` |
| 69 | `for (const field of cls.attributes) {` |
| 70 | `if (this.isServiceType(field.dataType) && !field.isInjected) {` |
| 88 | `for (const method of cls.methods) {` |
| 93 | `for (const call of method.calledMethods) {` |
| 113 | `if (!call.receiverIsInjected) {` |
| 134 | `for (const creation of method.createdObjects) {` |
| 136 | `if (this.isServiceClassName(className) || this.isRepositoryClassName(className) || this.isInfrastructureClassName(className)) {` |
| 156 | `if (businessLogicScore >= this.businessLogicThreshold) { // Threshold for significant business logic` |
| 174 | `if (isEndpoint) {` |
| 176 | `if (exposesInternalEntity) {` |
| 195 | `if (isEndpoint) {` |
| 199 | `if (domParam) {` |
| 239 | `if (isEndpoint) {` |
| 241 | `if (hasClassValidation) {` |
| 245 | `if (missingValidation) {` |
| 265 | `if (isEndpoint) {` |
| 267 | `if (improperErrorHandling) {` |
| 291 | `private buildClassMaps(astOutputs: FullASTOutput[]): void {` |
| 296 | `for (const ast of astOutputs) {` |
| 297 | `for (const cls of ast.classes) {` |
| 304 | `if (!this.simpleNameMap.has(simple)) {` |
| 312 | `private resolveTypeName(typeName: string, imports: ImportInfo[], currentPackage?: string): string | null {` |
| 314 | `if (typeName.includes('.')) {` |
| 318 | `for (const imp of imports) {` |
| 319 | `if (imp.simpleName === typeName && !imp.isWildcard) {` |
| 324 | `if (currentPackage) {` |
| 326 | `if (candidates) {` |
| 333 | `if (samePackageCandidates.length === 1) {` |
| 340 | `if (candidates && candidates.size === 1) {` |
| 347 | `private isApiResourceClass(cls: ClassInfo): boolean {` |
| 355 | `private isEndpointMethod(cls: ClassInfo, method: any): boolean {` |
| 372 | `private isServiceClassName(className: string): boolean {` |
| 376 | `private isRepositoryClassName(className: string): boolean {` |
| 380 | `private isInfrastructureClassName(className: string): boolean {` |
| 384 | `private isEntityClassName(className: string): boolean {` |
| 388 | `private isDTOClassName(className: string): boolean {` |
| 392 | `private isServiceType(typeName: string): boolean {` |
| 398 | `private isRepositoryType(typeName: string): boolean {` |
| 404 | `private getDependencyType(className: string): string {` |
| 413 | `private checkForExposingInternalEntity(method: Method, imports?: ImportInfo[], currentPackage?: string): string | null {` |
| 416 | `if (returnType && this.containsEntityType(returnType, imports, currentPackage)) {` |
| 432 | `private checkForMissingValidation(method: Method, cls?: ClassInfo): string | null {` |
| 437 | `for (const param of method.parameters) {` |
| 456 | `if (!isSimpleType && !isFrameworkBound && !hasValidation) {` |
| 464 | `private checkForImproperErrorHandling(method: Method): boolean {` |
| 467 | `const rawThrows = (method.throwsExceptions || []).some(ex => {` |
| 469 | `if (['Exception', 'RuntimeException', 'Throwable', 'IOException', 'SQLException', 'Error'].includes(raw)) {` |
| 477 | `const rawCreated = (method.createdObjects || []).some(o =>` |
| 489 | `private stripGenerics(typeName: string): string {` |
| 493 | `private isStandardLibraryType(typeName: string): boolean {` |
| 497 | `private isSimpleType(typeName: string): boolean {` |
| 501 | `private isInternalDomainType(typeName: string, imports: ImportInfo[], currentPackage?: string): boolean {` |
| 509 | `if (fqcn) {` |
| 519 | `private containsEntityType(typeName: string, imports?: ImportInfo[], currentPackage?: string): boolean {` |
| 525 | `if (fqcn) {` |
| 527 | `if (cls) {` |
| 536 | `private containsInternalDomainType(typeName: string, imports: ImportInfo[], currentPackage?: string): boolean {` |
| 542 | `private typeTokens(typeName: string): string[] {` |

## src/application/ai/aiAdvisoryCoordinator.ts

Type: TypeScript source  
Lines: 246

| Line | Declaration |
|---:|---|
| 13 | `export interface AdvisoryRunResult {` |
| 26 | `export interface AdvisorDependencies {` |
| 48 | `export class AiAdvisoryCoordinator {` |
| 49 | `constructor(private readonly deps: AdvisorDependencies) {}` |
| 51 | `async run(violations: Violation[]): Promise<AdvisoryRunResult> {` |
| 54 | `const noop = (outcome: AdvisoryRunResult['outcome'], latencyMs: number): AdvisoryRunResult => ({` |
| 58 | `if (!config.ai.enableAiAdvisory || config.ai.aiProvider === 'off') {` |
| 67 | `if (candidates.length === 0) {` |
| 85 | `if (useAi) {` |
| 124 | `const now = (this.deps.now ?? (() => new Date()))();` |
| 142 | `interface MergedResult {` |
| 147 | `function merge(` |
| 157 | `for (const d of [...heuristic, ...ai]) {` |
| 168 | `for (const d of ranked) {` |
| 169 | `if (d.violationId) {` |
| 180 | `for (const finding of d.findings) {` |
| 188 | `function probeIndex(d: AiDecision, ranked: AiDecision[]): number {` |
| 192 | `function advisoryViolation(` |
| 227 | `function attachInsights(violation: Violation, d: AiDecision): void {` |
| 241 | `function hash(s: string): string {` |

## src/application/ai/contextBuilder.ts

Type: TypeScript source  
Lines: 265

| Line | Declaration |
|---:|---|
| 8 | `export interface ContextBuildOptions {` |
| 32 | `export interface ContextBuildInput {` |
| 44 | `export function buildContext(input: ContextBuildInput): AiContextPayload {` |
| 50 | `for (const candidate of input.candidates) {` |
| 52 | `for (const step of path) {` |
| 79 | `export function buildCandidatePath(` |
| 94 | `const walk = (cls: ClassInfo, ast: FullASTOutput, method: Method, depth: number): void => {` |
| 117 | `for (const d of direct) {` |
| 126 | `interface LocatedMethod {` |
| 132 | `interface ClassEntry {` |
| 137 | `interface ResolvedCallee {` |
| 145 | `function resolveCalleeInfos(` |
| 153 | `for (const call of method.calledMethods || []) {` |
| 187 | `function locateMethod(filesMap: Record<string, FullASTOutput>, c: AiCandidate): LocatedMethod | null {` |
| 200 | `function inClassBounds(cls: ClassInfo, line?: number): boolean {` |
| 205 | `function isInMethod(m: Method, line: number): boolean {` |
| 210 | `function isPrivileged(m: Method): boolean {` |
| 214 | `function methodSignature(cls: ClassInfo, m: Method): string {` |
| 219 | `function stripGenerics(t: string): string {` |
| 223 | `function sourceSlice(` |
| 237 | `function buildClassMap(filesMap: Record<string, FullASTOutput>): Map<string, ClassEntry> {` |
| 239 | `for (const ast of Object.values(filesMap)) {` |
| 240 | `for (const cls of ast.classes) {` |
| 252 | `function resolveClassFQNs(` |

## src/application/ai/heuristicAdvisor.ts

Type: TypeScript source  
Lines: 78

| Line | Declaration |
|---:|---|
| 6 | `export interface HeuristicAdvisorOptions {` |
| 24 | `export function runHeuristicAdvisor(` |
| 33 | `for (const candidate of candidates) {` |

## src/application/ai/triage.ts

Type: TypeScript source  
Lines: 157

| Line | Declaration |
|---:|---|
| 24 | `export interface TriageOptions {` |
| 36 | `export function triageViolations(violations: Violation[], opts: TriageOptions): AiCandidate[] {` |
| 40 | `for (const v of violations) {` |
| 55 | `export function collectEntryPointProbes(` |
| 62 | `for (const filePath of Object.keys(filesMap)) {` |
| 64 | `for (const cls of ast.classes) {` |
| 66 | `for (const method of cls.methods) {` |
| 89 | `export function triageAll(` |
| 98 | `for (const c of [...fromViolations, ...probes]) {` |
| 108 | `function violationToCandidate(v: Violation): AiCandidate {` |
| 114 | `if (v.contextMetadata?.layerInvolved || v.contextMetadata?.sourceLayer || v.contextMetadata?.targetLayer) {` |
| 132 | `function classNameFromPath(filePath: string): string {` |
| 137 | `function isEntryPointClass(cls: ClassInfo, suffixes: string[]): boolean {` |
| 142 | `export function hasSecurityAnnotation(annotations: Array<{ name: string }>): boolean {` |
| 147 | `function httpVerbFor(method: Method): 'POST' | 'PUT' | 'DELETE' | 'PATCH' | null {` |
| 148 | `for (const ann of method.annotations) {` |

## src/application/ports/aiAuditLogger.ts

Type: TypeScript source  
Lines: 6

| Line | Declaration |
|---:|---|
| 3 | `export interface AiAuditLogger {` |
| 5 | `log(entry: AiAuditLogEntry): void;` |

## src/application/ports/aiDecisionProvider.ts

Type: TypeScript source  
Lines: 8

| Line | Declaration |
|---:|---|
| 3 | `export interface AiDecisionProvider {` |
| 5 | `isAvailable(): Promise<boolean>;` |
| 7 | `evaluate(context: AiContextPayload): Promise<AiDecision[]>;` |

## src/application/ports/analyzerService.ts

Type: TypeScript source  
Lines: 8

| Line | Declaration |
|---:|---|
| 4 | `export interface AnalyzerService {` |
| 5 | `analyze(asts: FullASTOutput[]): Violation[];` |
| 6 | `analyzeSingle(ast: FullASTOutput): Violation[];` |

## src/application/ports/backendService.ts

Type: TypeScript source  
Lines: 11

| Line | Declaration |
|---:|---|
| 1 | `export interface BackendService {` |
| 2 | `checkHealth(): Promise<boolean>;` |
| 3 | `sendFullAST(projectName: string, workspacePath: string, files: Record<string, any>): Promise<any>;` |
| 4 | `sendFileChange(changeType: 'created' | 'changed' | 'deleted' | 'renamed', filePath: string, ast: any | null, oldFilePath?: string): Promi...` |
| 5 | `resetBackend(): Promise<any>;` |
| 6 | `getFileAST(filePath: string): Promise<any>;` |
| 7 | `getFiles(): Promise<any>;` |
| 8 | `getStats(): Promise<any>;` |
| 9 | `getHistory(limit?: number): Promise<any>;` |

## src/application/ports/configProvider.ts

Type: TypeScript source  
Lines: 7

| Line | Declaration |
|---:|---|
| 3 | `export interface ConfigProvider {` |
| 4 | `getConfig(): AnalyzerConfig;` |
| 5 | `onConfigChange(callback: () => void): void;` |

## src/application/ports/diagnosticReporter.ts

Type: TypeScript source  
Lines: 8

| Line | Declaration |
|---:|---|
| 3 | `export interface DiagnosticReporter {` |
| 4 | `report(violations: Violation[], ignoredIds: Set<string>): void;` |
| 5 | `clearFile(filePath: string): void;` |
| 6 | `clear(): void;` |

## src/application/ports/parserService.ts

Type: TypeScript source  
Lines: 6

| Line | Declaration |
|---:|---|
| 3 | `export interface ParserService {` |
| 4 | `parse(sourceCode: string, filePath: string): FullASTOutput;` |

## src/application/ports/sourceProvider.ts

Type: TypeScript source  
Lines: 12

| Line | Declaration |
|---:|---|
| 1 | `export interface SourceFile {` |
| 6 | `export interface SourceProvider {` |
| 7 | `getWorkspaceRoot(): string;` |
| 8 | `findJavaFiles(excludePatterns?: string[]): Promise<string[]>;` |
| 9 | `readFile(filePath: string): Promise<string>;` |
| 10 | `readAll(): Promise<SourceFile[]>;` |

## src/astManager.ts

Type: TypeScript source  
Lines: 235

| Line | Declaration |
|---:|---|
| 6 | `export interface AnalysisResult {` |
| 13 | `export interface ProgressCallback {` |
| 17 | `export interface CancellationToken {` |
| 21 | `export class ASTManager {` |
| 64 | `if (javaFiles.length === 0) {` |
| 73 | `if (token?.isCancellationRequested) {` |
| 81 | `if (progressCallback) {` |
| 140 | `if (this.isExcluded(relativePath)) {` |
| 144 | `if (changeType === 'deleted') {` |
| 157 | `if (changeType === 'renamed' && oldRelPath) {` |
| 178 | `async handleFileDeleted(filePath: string): Promise<void> {` |
| 185 | `async handleFileRenamed(newFilePath: string, content: string, oldFilePath: string): Promise<void> {` |
| 193 | `setExcludePatterns(excludePatterns: string[]): void {` |
| 197 | `getCachedAST(filePath: string): any | undefined {` |
| 201 | `getCachedFileCount(): number {` |
| 205 | `getAllCachedASTs(): any[] {` |
| 209 | `private isExcluded(relativePath: string): boolean {` |
| 211 | `for (const pattern of this.excludePatterns) {` |
| 213 | `if (normalizedPath.includes(cleaned)) {` |
| 220 | `private countNodes(node: any): number {` |
| 223 | `if (Array.isArray(node)) {` |
| 227 | `if (typeof value === 'object' && value !== null) {` |

## src/astTypes.ts

Type: TypeScript source  
Lines: 1

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/codeActionProvider.ts

Type: TypeScript source  
Lines: 161

| Line | Declaration |
|---:|---|
| 7 | `function diagnosticCode(diag: vscode.Diagnostic): string | number | undefined {` |
| 16 | `export class AiQuickFixCodeActionProvider implements vscode.CodeActionProvider {` |
| 19 | `constructor(private readonly getViolations: () => Violation[]) {}` |
| 27 | `for (const diag of context.diagnostics) {` |
| 31 | `for (const remediation of violation.remediationSuggestions || []) {` |
| 39 | `if (remediation.edits?.length) {` |
| 57 | `if (quickFix?.edits?.length && !this.hasSameEditAction(actions, quickFix)) {` |
| 71 | `private hasSameEditAction(actions: vscode.CodeAction[], quickFix: AiQuickFix): boolean {` |
| 75 | `private buildWorkspaceEdit(document: vscode.TextDocument, quickFix: AiQuickFix): vscode.WorkspaceEdit {` |
| 79 | `for (const e of quickFix.edits) {` |
| 89 | `const endOfLine = () => {` |
| 94 | `switch (e.kind) {` |
| 110 | `private isSameFile(document: vscode.TextDocument, filePath: string): boolean {` |
| 122 | `export async function showFixGuidance(violation: Violation, remediation: RemediationSuggestion): Promise<void> {` |

## src/controllerLayerDetector.ts

Type: TypeScript source  
Lines: 527

| Line | Declaration |
|---:|---|
| 4 | `export interface ControllerLayerViolation {` |
| 19 | `export class ControllerLayerAnalyzer {` |
| 73 | `setBusinessLogicThreshold(value: number): void {` |
| 77 | `analyze(astOutputs: FullASTOutput[]): ControllerLayerViolation[] {` |
| 84 | `for (const ast of astOutputs) {` |
| 85 | `for (const cls of ast.classes) {` |
| 86 | `if (cls.detectedLayer !== 'controller') {` |
| 96 | `for (const field of cls.attributes) {` |
| 97 | `if (isSpringManaged && (this.isServiceType(field.dataType) || this.isRepositoryType(field.dataType))) {` |
| 98 | `if (!field.isInjected) {` |
| 117 | `for (const method of cls.methods) {` |
| 122 | `for (const call of method.calledMethods) {` |
| 141 | `if (isSpringManaged && !isStandardLib && ((isServiceByLayer || isServiceByName) || (isRepoByLayer || isRepoByName))) {` |
| 142 | `if (!call.receiverIsInjected) {` |
| 180 | `if (this.isHttpClientType(simpleName)) {` |
| 191 | `if (this.isFileIOType(simpleName)) {` |
| 202 | `if (!allowedFileMethods.has(call.calledMethodName)) {` |
| 214 | `if (this.isThreadType(simpleName) && this.isThreadManagementCall(call.calledMethodName)) {` |
| 225 | `if (this.isRawSQLType(simpleName)) {` |
| 237 | `if (targetFQCN && targetFQCN !== simpleName) {` |
| 239 | `if (this.isHttpClientType(fqcnSimple)) {` |
| 285 | `for (const creation of method.createdObjects) {` |
| 287 | `if (isSpringManaged && (this.isServiceClassName(className) || this.isRepositoryClassName(className) || this.isInfrastructureClassName(cla...` |
| 299 | `if (this.isHttpClientType(className)) {` |
| 346 | `const methodLoc = (method.endLine || method.startLine || 0) - (method.startLine || 0);` |
| 347 | `if (businessLogicScore >= this.businessLogicThreshold && methodLoc >= 5) { // Threshold for significant business logic` |
| 366 | `for (const field of cls.attributes) {` |
| 367 | `if (field.isStatic) {` |
| 372 | `if (isExplicitCache || (isMapType && nameHint)) {` |
| 401 | `private buildClassMaps(astOutputs: FullASTOutput[]): void {` |
| 406 | `for (const ast of astOutputs) {` |
| 407 | `for (const cls of ast.classes) {` |
| 414 | `if (!this.simpleNameMap.has(simple)) {` |
| 422 | `private resolveTypeName(typeName: string, imports: ImportInfo[], currentPackage?: string): string | null {` |
| 424 | `if (typeName.includes('.')) {` |
| 428 | `for (const imp of imports) {` |
| 429 | `if (imp.simpleName === typeName && !imp.isWildcard) {` |
| 434 | `if (currentPackage) {` |
| 436 | `if (candidates) {` |
| 443 | `if (samePackageCandidates.length === 1) {` |
| 450 | `if (candidates && candidates.size === 1) {` |
| 457 | `private isServiceClassName(className: string): boolean {` |
| 461 | `private isRepositoryClassName(className: string): boolean {` |
| 465 | `private isInfrastructureClassName(className: string): boolean {` |
| 469 | `private isServiceType(typeName: string): boolean {` |
| 475 | `private isRepositoryType(typeName: string): boolean {` |
| 482 | `private isSpringManaged(cls: ClassInfo): boolean {` |
| 490 | `private isHttpClientType(typeName: string): boolean {` |
| 495 | `private isFileIOType(typeName: string): boolean {` |
| 500 | `private isThreadType(typeName: string): boolean {` |
| 505 | `private isThreadManagementCall(methodName: string): boolean {` |
| 509 | `private isAllowedFileMethod(methodName: string): boolean {` |
| 518 | `private isCacheType(typeName: string): boolean {` |
| 523 | `private isRawSQLType(typeName: string): boolean {` |

## src/crossFileAnalyzer.ts

Type: TypeScript source  
Lines: 160

| Line | Declaration |
|---:|---|
| 11 | `export interface CrossFileRule {` |
| 15 | `run(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[];` |
| 29 | `function toUnifiedViolation(` |
| 61 | `function toUnifiedFromEdge(` |
| 103 | `function wrapAnalyzerRule(rule: AnalyzerRule, mitigationHint: string): CrossFileRule {` |
| 108 | `run(graph: ProjectDependencyGraph, _files: Record<string, FullASTOutput>): Violation[] {` |
| 115 | `export class CrossFileAnalyzer {` |
| 118 | `constructor() {` |
| 122 | `private registerDefaultRules(): void {` |
| 134 | `public addRule(rule: CrossFileRule): void {` |
| 138 | `public analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[] {` |
| 140 | `for (const rule of this.rules) {` |
| 151 | `public getRules(): CrossFileRule[] {` |
| 156 | `export function buildCrossFileAnalyzer(): CrossFileAnalyzer {` |

## src/dependencyGraph.ts

Type: TypeScript source  
Lines: 810

| Line | Declaration |
|---:|---|
| 6 | `export interface GraphNode {` |
| 17 | `export interface GraphEdgeLocation {` |
| 23 | `export interface GraphEdge {` |
| 31 | `export interface Violation {` |
| 43 | `export class ProjectDependencyGraph {` |
| 47 | `addNode(id: string, type: GraphNode['type'], metadata: GraphNode['metadata']): boolean {` |
| 53 | `getNode(id: string): GraphNode | undefined {` |
| 57 | `ensureNode(id: string, type: GraphNode['type'], metadata: GraphNode['metadata']): void {` |
| 58 | `if (!this.nodes.has(id)) {` |
| 63 | `addEdge(source: string, target: string, type: GraphEdge['type'], location?: GraphEdgeLocation): void {` |
| 67 | `if (existing) {` |
| 69 | `if (location && !existing.locations.some(l => l.line === location.line && l.sourceFile === location.sourceFile)) {` |
| 83 | `resolveTypeFQN(simpleName: string, fileImports: ImportInfo[], ownPackage: string): string | null {` |
| 88 | `if (baseName.includes('.') && this.nodes.has(baseName)) {` |
| 93 | `for (const imp of fileImports) {` |
| 94 | `if (imp.simpleName === baseName && !imp.isWildcard) {` |
| 100 | `for (const imp of fileImports) {` |
| 101 | `if (imp.isWildcard) {` |
| 104 | `if (this.nodes.has(candidate)) {` |
| 108 | `for (const [nid] of this.nodes) {` |
| 112 | `if (simple === baseName && pkg === pkgPrefix) {` |
| 121 | `if (this.nodes.has(samePackageCandidate)) {` |
| 127 | `if (this.nodes.has(javaLang)) {` |
| 132 | `for (const [nid] of this.nodes) {` |
| 135 | `if (simple === baseName) {` |
| 143 | `getIncomingEdges(nodeId: string): GraphEdge[] {` |
| 147 | `getOutgoingEdges(nodeId: string): GraphEdge[] {` |
| 159 | `getFanIn(nodeId: string): number {` |
| 161 | `for (const edge of this.edges) {` |
| 174 | `getFanOut(nodeId: string): number {` |
| 176 | `for (const edge of this.edges) {` |
| 185 | `findNodesByLayer(layer: string): GraphNode[] {` |
| 187 | `for (const node of this.nodes.values()) {` |
| 188 | `if (node.metadata.layer === layer) {` |
| 195 | `findNodesBySimpleName(name: string): GraphNode[] {` |
| 197 | `for (const node of this.nodes.values()) {` |
| 198 | `if (node.metadata.simpleName === name) {` |
| 206 | `private buildClassAdjacency(): Map<string, string[]> {` |
| 208 | `for (const [id, node] of this.nodes) {` |
| 209 | `if (node.type === 'class' || node.type === 'interface') {` |
| 214 | `for (const edge of this.edges) {` |
| 215 | `if (depTypes.has(edge.type) && adj.has(edge.source) && adj.has(edge.target)) {` |
| 226 | `findSCCs(): string[][] {` |
| 235 | `const strongConnect = (v: string) => {` |
| 243 | `for (const w of neighbors) {` |
| 244 | `if (!indexMap.has(w)) {` |
| 252 | `if (lowLink.get(v) === indexMap.get(v)) {` |
| 260 | `if (component.length > 1) {` |
| 266 | `for (const [id] of adj) {` |
| 267 | `if (!indexMap.has(id)) {` |
| 280 | `reachable(source: string, target: string, maxHops?: number): boolean {` |
| 287 | `while (queue.length > 0) {` |
| 290 | `for (const neighbor of adj.get(id) || []) {` |
| 292 | `if (!visited.has(neighbor)) {` |
| 305 | `reachableFrom(source: string, maxHops?: number): string[] {` |
| 311 | `while (queue.length > 0) {` |
| 314 | `for (const neighbor of adj.get(id) || []) {` |
| 315 | `if (!visited.has(neighbor)) {` |
| 327 | `export function buildGraphFromFiles(files: Record<string, FullASTOutput>): ProjectDependencyGraph {` |
| 331 | `for (const [filePath, ast] of Object.entries(files)) {` |
| 340 | `for (const cls of ast.classes) {` |
| 351 | `for (const [filePath, ast] of Object.entries(files)) {` |
| 354 | `for (const imp of ast.imports) {` |
| 358 | `if (!imp.isWildcard) {` |
| 375 | `for (const cls of ast.classes) {` |
| 376 | `for (const rel of ast.relationships) {` |
| 377 | `if (rel.sourceId === cls.fullyQualifiedName) {` |
| 379 | `if (targetId) {` |
| 395 | `for (const method of cls.methods) {` |
| 396 | `for (const call of method.calledMethods) {` |
| 397 | `if (call.targetClass && !call.isLibraryCall) {` |
| 399 | `if (resolved && resolved !== cls.fullyQualifiedName) {` |
| 411 | `for (const method of cls.methods) {` |
| 412 | `for (const creation of method.createdObjects) {` |
| 414 | `if (resolved) {` |
| 429 | `export function addFileToGraph(` |
| 442 | `for (const cls of ast.classes) {` |
| 452 | `export function removeFileFromGraph(` |
| 459 | `for (const [id, node] of graph.nodes) {` |
| 460 | `if (node.metadata.filePath === filePath) {` |
| 471 | `for (const id of nodeIdsToRemove) {` |
| 476 | `export function patchGraphForFile(` |
| 491 | `for (const imp of newAst.imports) {` |
| 493 | `if (!imp.isWildcard) {` |
| 507 | `for (const cls of newAst.classes) {` |
| 508 | `for (const rel of newAst.relationships) {` |
| 509 | `if (rel.sourceId === cls.fullyQualifiedName) {` |
| 511 | `if (targetId) {` |
| 526 | `for (const method of cls.methods) {` |
| 527 | `for (const call of method.calledMethods) {` |
| 528 | `if (call.targetClass && !call.isLibraryCall) {` |
| 530 | `if (resolved && resolved !== cls.fullyQualifiedName) {` |
| 540 | `for (const creation of method.createdObjects) {` |
| 542 | `if (resolved) {` |
| 554 | `function resolveEdgeTarget(targetId: string, graph: ProjectDependencyGraph, imports: ImportInfo[], ownPackage: string): string | null {` |
| 563 | `if (baseName.includes('.')) {` |
| 575 | `export interface AnalyzerRule {` |
| 579 | `analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[];` |
| 587 | `analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[] {` |
| 594 | `for (const ctrl of controllers) {` |
| 596 | `for (const edge of outgoing) {` |
| 597 | `if ((edge.type === 'calls' || edge.type === 'has-a' || edge.type === 'uses') && repoIds.has(edge.target)) {` |
| 598 | `for (const loc of edge.locations) {` |
| 623 | `analyze(graph: ProjectDependencyGraph, _files: Record<string, FullASTOutput>): Violation[] {` |
| 631 | `for (const edge of graph.edges) {` |
| 632 | `if (edge.type === 'calls' || edge.type === 'has-a' || edge.type === 'uses') {` |
| 635 | `if (sourceNode?.metadata.layer && targetNode?.metadata.layer) {` |
| 638 | `if (sourceRank < targetRank && targetRank >= 0 && sourceRank >= 0) {` |
| 639 | `for (const loc of edge.locations) {` |
| 659 | `for (const component of sccs) {` |
| 682 | `analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[] {` |
| 691 | `for (const [, ast] of Object.entries(files)) {` |
| 692 | `for (const cls of ast.classes) {` |
| 693 | `if (cls.annotations?.some(a => a.name === 'Entity')) {` |
| 700 | `for (const [, ast] of Object.entries(files)) {` |
| 701 | `for (const cls of ast.classes) {` |
| 704 | `for (const method of cls.methods) {` |
| 709 | `if (entityIds.has(retBase) || entitySimpleNames.has(retBase)) {` |
| 723 | `for (const param of method.parameters) {` |
| 725 | `if (entityIds.has(paramBase) || entitySimpleNames.has(paramBase)) {` |
| 741 | `for (const attr of cls.attributes) {` |
| 742 | `if (attr.accessModifier === 'public' || attr.accessModifier === 'protected') {` |
| 744 | `if (entityIds.has(attrBase) || entitySimpleNames.has(attrBase)) {` |
| 770 | `analyze(graph: ProjectDependencyGraph, _files: Record<string, FullASTOutput>): Violation[] {` |
| 781 | `for (const [fromLayer, toLayer] of forbiddenEdges) {` |
| 785 | `for (const node of fromNodes) {` |
| 787 | `for (const edge of outgoing) {` |
| 788 | `if (toIds.has(edge.target) && (edge.type === 'calls' || edge.type === 'has-a' || edge.type === 'uses')) {` |
| 789 | `for (const loc of edge.locations) {` |

## src/designPatternAnalyzer.ts

Type: TypeScript source  
Lines: 1406

| Line | Declaration |
|---:|---|
| 33 | `export type DesignPatternRuleType = typeof DESIGN_PATTERN_RULE_TYPES[number];` |
| 87 | `export class DesignPatternAnalyzer {` |
| 90 | `constructor(config?: Partial<AnalyzerConfig>) {` |
| 114 | `setConfig(config: Partial<AnalyzerConfig>): void {` |
| 118 | `analyze(asts: FullASTOutput[], graph?: ProjectDependencyGraph, classLookup?: Record<string, FullASTOutput>): Violation[] {` |
| 133 | `const run = (ruleType: DesignPatternRuleType, collect: () => Violation[]) => {` |
| 217 | `private checkRawThread(asts: FullASTOutput[]): Violation[] {` |
| 219 | `for (const ast of asts) {` |
| 225 | `for (const cls of ast.classes) {` |
| 226 | `for (const method of cls.methods) {` |
| 227 | `for (const creation of method.createdObjects) {` |
| 228 | `if (this.THREAD_TYPES.has(creation.className)) {` |
| 236 | `for (const call of method.calledMethods) {` |
| 238 | `if (call.calledMethodName === 'execute' && simple === 'Executors') {` |
| 263 | `private checkMutableSingleton(asts: FullASTOutput[]): Violation[] {` |
| 265 | `for (const ast of asts) {` |
| 266 | `for (const cls of ast.classes) {` |
| 267 | `for (const field of cls.attributes) {` |
| 270 | `if (this.MUTABLE_TYPES.has(rawType) || this.MUTABLE_INTERFACE_TYPES.has(rawType)) {` |
| 285 | `private checkMissingAbstraction(asts: FullASTOutput[], _graph?: ProjectDependencyGraph): Violation[] {` |
| 291 | `for (const [impl, abs] of implMap) {` |
| 301 | `for (const ast of asts) {` |
| 302 | `for (const cls of ast.classes) {` |
| 303 | `for (const field of cls.attributes) {` |
| 307 | `for (const method of cls.methods) {` |
| 308 | `for (const param of method.parameters) {` |
| 312 | `for (const call of method.calledMethods || []) {` |
| 313 | `const recv = (call.receiverType || '').replace(/<.*>/g, '').trim();` |
| 320 | `for (const [fqcn, cls] of this.classIndex(asts)) {` |
| 340 | `private buildImplementationMap(asts: FullASTOutput[]): Map<string, string> {` |
| 342 | `for (const ast of asts) {` |
| 343 | `for (const cls of ast.classes) {` |
| 345 | `if (cls.interfaces) {` |
| 346 | `for (const iface of cls.interfaces) {` |
| 351 | `if (cls.superClass && cls.superClass !== 'Object' && cls.superClass !== 'Enum' && cls.superClass !== 'Record') {` |
| 353 | `if (superCls?.isAbstract) {` |
| 362 | `private resolveAbstractionFqcn(typeName: string, asts: FullASTOutput[]): string | null {` |
| 367 | `for (const ast of asts) {` |
| 368 | `for (const cls of ast.classes) {` |
| 370 | `if (fqcn === raw || cls.className === raw) {` |
| 381 | `private classIndex(asts: FullASTOutput[]): Map<string, ClassInfo> {` |
| 383 | `for (const ast of asts) {` |
| 384 | `for (const cls of ast.classes) {` |
| 391 | `private findClass(simpleOrFqcn: string, asts: FullASTOutput[]): ClassInfo | undefined {` |
| 392 | `for (const ast of asts) {` |
| 393 | `for (const cls of ast.classes) {` |
| 415 | `private checkMissingAdapter(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 417 | `for (const ast of asts) {` |
| 421 | `for (const imp of ast.imports || []) {` |
| 426 | `if (!this.hasAdapterFor(imp.qualifiedName, allAsts)) {` |
| 438 | `private hasAdapterFor(sdkFqcn: string, allAsts: FullASTOutput[]): boolean {` |
| 442 | `for (const ast of allAsts) {` |
| 443 | `const rawPath = (ast.filePath || '').replace(/\\/g, '/');` |
| 447 | `for (const cls of ast.classes) {` |
| 454 | `if (portCandidate.length >= 2 && cls.className.toLowerCase().includes(portCandidate)) {` |
| 465 | `private checkMissingFactory(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 470 | `for (const ast of asts) {` |
| 471 | `for (const cls of ast.classes) {` |
| 475 | `for (const method of cls.methods) {` |
| 479 | `for (const creation of method.createdObjects) {` |
| 483 | `if (!instantiationCounts.has(target)) {` |
| 494 | `for (const [concrete, info] of instantiationCounts) {` |
| 513 | `private resolveClass(simpleOrFqcn: string, allAsts: FullASTOutput[]): ClassInfo | undefined {` |
| 514 | `for (const ast of allAsts) {` |
| 515 | `for (const cls of ast.classes) {` |
| 525 | `private checkGodFacade(asts: FullASTOutput[], graph?: ProjectDependencyGraph): Violation[] {` |
| 529 | `for (const ast of asts) {` |
| 530 | `for (const cls of ast.classes) {` |
| 541 | `for (const method of cls.methods) {` |
| 542 | `if (method.calledMethods.length === 1 && method.createdObjects.length === 0) {` |
| 543 | `const methodLoc = (method.endLine || method.startLine || 0) - (method.startLine || 0);` |
| 562 | `private checkMissingStrategy(asts: FullASTOutput[]): Violation[] {` |
| 564 | `for (const ast of asts) {` |
| 565 | `for (const cls of ast.classes) {` |
| 569 | `for (const method of cls.methods) {` |
| 574 | `if (ifPoints.length >= 4) {` |
| 579 | `if (uniqueVarNames.size <= 2) {` |
| 591 | `for (const sp of switchPoints) {` |
| 593 | `if (caseCount >= 4) {` |
| 611 | `private checkLeakingConstruction(asts: FullASTOutput[]): Violation[] {` |
| 614 | `for (const ast of asts) {` |
| 615 | `for (const cls of ast.classes) {` |
| 618 | `for (const method of cls.methods) {` |
| 621 | `for (const creation of method.createdObjects) {` |
| 627 | `if (flagged && (!best || (branching && !best.creation.hasBranching) || stmtCount > best.count)) {` |
| 631 | `if (best) {` |
| 649 | `private countConstructionStatements(creation: any): number {` |
| 651 | `for (const arg of creation.constructorArgs || []) {` |
| 664 | `private checkFatInterface(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 667 | `for (const ast of asts) {` |
| 668 | `for (const cls of ast.classes) {` |
| 673 | `if (declared > limit) {` |
| 688 | `if (ratio < this.INTERFACE_USAGE_RATIO_THRESHOLD) {` |
| 701 | `private collectImplementationTypeNames(allAsts: FullASTOutput[], className: string, fqcn: string): Set<string> {` |
| 703 | `for (const ast of allAsts) {` |
| 704 | `for (const c of ast.classes) {` |
| 706 | `for (const impl of c.interfaces || []) {` |
| 708 | `if (last === className || impl === fqcn || impl === className) {` |
| 719 | `private collectUsedInterfaceMethods(allAsts: FullASTOutput[], relatedTypes: Set<string>, declNames: Set<string>): Set<string> {` |
| 721 | `for (const ast of allAsts) {` |
| 722 | `for (const c of ast.classes) {` |
| 723 | `for (const m of c.methods) {` |
| 724 | `for (const call of m.calledMethods || []) {` |
| 725 | `const receiver = (call.receiverType || call.targetClass || '').replace(/<.*>/g, '').trim().split('.').pop() || '';` |
| 726 | `if (relatedTypes.has(receiver) && declNames.has(call.calledMethodName)) {` |
| 740 | `private checkMissingCommand(asts: FullASTOutput[]): Violation[] {` |
| 743 | `for (const ast of asts) {` |
| 744 | `for (const cls of ast.classes) {` |
| 745 | `for (const method of cls.methods) {` |
| 767 | `private checkMissingPrototype(asts: FullASTOutput[]): Violation[] {` |
| 769 | `for (const ast of asts) {` |
| 770 | `for (const cls of ast.classes) {` |
| 776 | `for (const method of cls.methods) {` |
| 794 | `private countCopyPairs(calls: MethodCall[]): number {` |
| 798 | `for (const s of setters) {` |
| 812 | `private checkFragmentedFactories(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 823 | `for (const f of factories) {` |
| 824 | `for (const ast of asts) {` |
| 843 | `private checkMissingDecorator(asts: FullASTOutput[]): Violation[] {` |
| 846 | `for (const ast of asts) {` |
| 847 | `for (const cls of ast.classes) {` |
| 849 | `for (const method of cls.methods) {` |
| 871 | `private checkMissingComposite(asts: FullASTOutput[]): Violation[] {` |
| 873 | `for (const ast of asts) {` |
| 874 | `for (const cls of ast.classes) {` |
| 875 | `for (const method of cls.methods) {` |
| 896 | `private isFlyweightValueType(className: string): boolean {` |
| 901 | `private checkRedundantMemory(asts: FullASTOutput[]): Violation[] {` |
| 903 | `for (const ast of asts) {` |
| 904 | `for (const cls of ast.classes) {` |
| 905 | `for (const method of cls.methods) {` |
| 906 | `const missingInLoop = (method.createdObjects || []).filter(c => c.insideLoop === true && this.isFlyweightValueType(c.className));` |
| 924 | `private checkScatteredStateMachine(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 928 | `for (const ast of allAsts) {` |
| 929 | `for (const cls of ast.classes) {` |
| 937 | `for (const ast of asts) {` |
| 938 | `for (const cls of ast.classes) {` |
| 939 | `for (const method of cls.methods) {` |
| 940 | `const stateChecks = (method.complexityMetrics?.decisionPoints || []).filter(d => this.STATE_CONDITION_RE.test(d.condition || ''));` |
| 955 | `private checkDuplicateAlgorithm(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 959 | `for (const ast of allAsts) {` |
| 960 | `for (const cls of ast.classes) {` |
| 961 | `for (const method of cls.methods) {` |
| 978 | `for (const m of [a, b]) {` |
| 992 | `private isDuplicateAlgorithmCandidate(cls: ClassInfo, method: Method): boolean {` |
| 1004 | `private meaningfulAlgorithmCalls(calls: MethodCall[]): MethodCall[] {` |
| 1014 | `private sequenceSimilarity(a: MethodCall[], b: MethodCall[]): number {` |
| 1018 | `const lcs = (x: string[], y: string[]): number => {` |
| 1037 | `private checkHardcodedNotifier(asts: FullASTOutput[]): Violation[] {` |
| 1040 | `for (const ast of asts) {` |
| 1041 | `for (const cls of ast.classes) {` |
| 1042 | `for (const method of cls.methods) {` |
| 1044 | `for (const call of method.calledMethods || []) {` |
| 1045 | `const type = (call.receiverType || '').replace(/<.*>/g, '').trim().split('.').pop() || '';` |
| 1046 | `if (this.NOTIFIER_TYPE_RE.test(type) && this.NOTIFIER_METHOD_RE.test(call.calledMethodName)) {` |
| 1064 | `private checkMonolithicPipeline(asts: FullASTOutput[]): Violation[] {` |
| 1067 | `for (const ast of asts) {` |
| 1068 | `for (const cls of ast.classes) {` |
| 1069 | `for (const method of cls.methods) {` |
| 1078 | `for (const d of topLevel) {` |
| 1080 | `if (/(==|!=)\s*null|null\s*(==|!=)/i.test(cond)) {` |
| 1106 | `private checkServiceLocator(asts: FullASTOutput[]): Violation[] {` |
| 1108 | `for (const ast of asts) {` |
| 1111 | `for (const cls of ast.classes) {` |
| 1112 | `for (const method of cls.methods) {` |
| 1113 | `for (const call of method.calledMethods || []) {` |
| 1114 | `const type = (call.receiverType || '').replace(/<.*>/g, '').trim().split('.').pop() || '';` |
| 1115 | `if (this.SERVICE_LOCATOR_TYPE_RE.test(type) && this.SERVICE_LOCATOR_METHOD_RE.test(call.calledMethodName)) {` |
| 1134 | `private nullCheckTarget(condition: string): string | null {` |
| 1146 | `private checkExcessiveNullChecks(asts: FullASTOutput[]): Violation[] {` |
| 1149 | `for (const ast of asts) {` |
| 1150 | `for (const cls of ast.classes) {` |
| 1151 | `for (const method of cls.methods) {` |
| 1152 | `const nullChecks = (method.complexityMetrics?.decisionPoints || [])` |
| 1158 | `for (const d of nullChecks) {` |
| 1193 | `private checkMissingProxy(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 1199 | `for (const ast of allAsts) {` |
| 1200 | `for (const cls of ast.classes) {` |
| 1206 | `for (const iface of cls.interfaces) {` |
| 1213 | `for (const ast of asts) {` |
| 1219 | `for (const cls of ast.classes) {` |
| 1224 | `for (const method of cls.methods) {` |
| 1226 | `for (const creation of method.createdObjects || []) {` |
| 1245 | `for (const call of method.calledMethods || []) {` |
| 1246 | `const target = (call.receiverType || call.targetClass || '').split('.').pop() || '';` |
| 1271 | `private checkMissingBridge(asts: FullASTOutput[], allAsts: FullASTOutput[]): Violation[] {` |
| 1273 | `const threshold = (this.config as any).bridgeHierarchyThreshold ?? 4;` |
| 1280 | `for (const ast of allAsts) {` |
| 1281 | `for (const cls of ast.classes) {` |
| 1288 | `for (const ast of asts) {` |
| 1289 | `for (const cls of ast.classes) {` |
| 1302 | `for (const [parentFqcn, children] of familyMap) {` |
| 1338 | `private extractDimensionTokens(names: string[]): { dimensions: { values: string[] }[] } {` |
| 1350 | `private hasRepetitiveAffixes(names: string[]): boolean {` |
| 1354 | `for (const n of names) {` |
| 1356 | `if (tokens.length >= 2) {` |
| 1368 | `private isConfigurationClass(ast: FullASTOutput): boolean {` |
| 1374 | `private matchLayer(filePath: string): string | null {` |
| 1379 | `for (const [name, boundary] of Object.entries(boundaries)) {` |
| 1380 | `for (const pattern of boundary.packages) {` |
| 1381 | `for (const cand of candidates) {` |
| 1389 | `private simpleGlobMatch(path: string, pattern: string): boolean {` |
| 1402 | `private getClassName(ast: FullASTOutput): string {` |

## src/detectorUtils.ts

Type: TypeScript source  
Lines: 38

| Line | Declaration |
|---:|---|
| 4 | `export function rawTypeName(typeName: string): string {` |
| 8 | `export function simpleTypeName(typeName: string): string {` |
| 13 | `export function typeTokens(typeName: string): string[] {` |
| 17 | `export function hasAnnotation(annotations: Annotation[] | undefined, names: Iterable<string>): boolean {` |
| 26 | `export function lineRange(` |

## src/documentation.ts

Type: TypeScript source  
Lines: 43

| Line | Declaration |
|---:|---|
| 4 | `function markdownPathFromTarget(target?: string): string[] {` |
| 7 | `if (/^https?:\/\//i.test(docPath)) {` |
| 16 | `if (!docPath || docPath === 'index.html' || docPath === 'index.md') {` |
| 21 | `if (!docPath.endsWith('.md')) {` |
| 26 | `if (parts.includes('..') || parts.some(part => path.isAbsolute(part))) {` |
| 32 | `export async function openRicaDocumentation(extensionUri: vscode.Uri, target?: string): Promise<void> {` |

## src/documentationCodeActionProvider.ts

Type: TypeScript source  
Lines: 42

| Line | Declaration |
|---:|---|
| 3 | `function diagnosticDocTarget(diag: vscode.Diagnostic): vscode.Uri | undefined {` |
| 4 | `if (typeof diag.code === 'object' && diag.code.target) {` |
| 15 | `export class DocumentationCodeActionProvider implements vscode.CodeActionProvider {` |
| 25 | `for (const diag of context.diagnostics) {` |

## src/domain/ai.ts

Type: TypeScript source  
Lines: 118

| Line | Declaration |
|---:|---|
| 3 | `export type AiProviderKind = 'off' | 'ollama' | 'openai-compatible';` |
| 4 | `export type AiTriggerKind = 'onDemand' | 'onSave' | 'onFullScan';` |
| 9 | `export interface AiCandidate {` |
| 22 | `export type AiExecutionStepRole = 'entryPoint' | 'service' | 'infrastructure';` |
| 27 | `export interface AiExecutionStep {` |
| 44 | `export interface AiContextPayload {` |
| 52 | `export type AiDecisionVerdict = 'VIOLATION' | 'NO_VIOLATION' | 'AMBIGUOUS';` |
| 54 | `export interface AiQuickFixEdit {` |
| 62 | `export interface AiQuickFix {` |
| 68 | `export interface AiSemanticFinding {` |
| 77 | `export interface AiAmbiguityResolution {` |
| 82 | `export interface AiDecision {` |
| 95 | `export interface AiInsights {` |
| 105 | `export interface AiAuditLogEntry {` |

## src/domain/analyzerConfig.ts

Type: TypeScript source  
Lines: 56

| Line | Declaration |
|---:|---|
| 1 | `export interface LayerBoundary {` |
| 6 | `export interface AiConfig {` |
| 18 | `export interface AnalyzerConfig {` |

## src/domain/astTypes.ts

Type: TypeScript source  
Lines: 411

| Line | Declaration |
|---:|---|
| 4 | `export interface PackageInfo {` |
| 18 | `export interface AttributeEncapsulation {` |
| 25 | `export interface Attribute {` |
| 53 | `export interface Constructor {` |
| 78 | `export interface InjectionAssignment {` |
| 84 | `export interface Parameter {` |
| 105 | `export interface DecisionPoint {` |
| 113 | `export interface ComplexityMetrics {` |
| 119 | `export interface LocalVariable {` |
| 139 | `export interface PersistenceWrite {` |
| 144 | `export interface MethodBodyInfo {` |
| 157 | `export interface MethodMemoryBehavior {` |
| 162 | `export interface Method {` |
| 191 | `export interface GenericTypeParam {` |
| 197 | `export interface AnnotationElement {` |
| 203 | `export interface Annotation {` |
| 218 | `export interface MethodCall {` |
| 231 | `export interface ObjectCreation {` |
| 244 | `export interface ImportInfo {` |
| 256 | `export interface Interface {` |
| 271 | `export interface DefaultMethod {` |
| 276 | `export interface StaticMethod {` |
| 280 | `export interface Constant {` |
| 286 | `export interface EnumConstant {` |
| 292 | `export interface Enum {` |
| 305 | `export interface RecordComponent {` |
| 311 | `export interface JavaRecord {` |
| 324 | `export interface LayerClassification {` |
| 335 | `export interface RelationshipMetadata {` |
| 345 | `export interface Relationship {` |
| 353 | `export interface ClassInfo {` |
| 392 | `export interface FullASTOutput {` |
| 403 | `export interface ASTProjectOutput {` |

## src/domain/violations.ts

Type: TypeScript source  
Lines: 84

| Line | Declaration |
|---:|---|
| 1 | `export type ViolationSeverity = 'error' | 'warning' | 'info';` |
| 5 | `export type FixSafety = 'auto-safe' | 'preview-required' | 'manual-design-required';` |
| 7 | `export interface RemediationSuggestion {` |
| 15 | `export interface DiagnosticRange {` |
| 20 | `export interface RelatedInformation {` |
| 26 | `export interface ViolationContextMetadata {` |
| 36 | `export type ViolationConfidence = 'High' | 'Medium' | 'Low';` |
| 38 | `export interface ViolationAnalysisMetadata {` |
| 45 | `export interface Violation {` |
| 78 | `export interface ViolationSummary {` |

## src/entityLayerDetector.ts

Type: TypeScript source  
Lines: 380

| Line | Declaration |
|---:|---|
| 5 | `export interface EntityLayerViolation {` |
| 19 | `export class EntityLayerAnalyzer {` |
| 45 | `setBusinessLogicThreshold(value: number): void {` |
| 49 | `analyze(astOutputs: FullASTOutput[]): EntityLayerViolation[] {` |
| 56 | `for (const ast of astOutputs) {` |
| 57 | `for (const cls of ast.classes) {` |
| 58 | `if (cls.detectedLayer !== 'entity') {` |
| 63 | `for (const field of cls.attributes) {` |
| 64 | `if (this.isImproperDependency(field.dataType)) {` |
| 79 | `if (this.isRawSQLType(field.dataType)) {` |
| 97 | `for (const method of cls.methods) {` |
| 102 | `for (const call of method.calledMethods) {` |
| 122 | `if (!call.receiverIsInjected) {` |
| 143 | `for (const creation of method.createdObjects) {` |
| 145 | `if (this.isImproperDependency(className)) {` |
| 167 | `if (rawSqlCall) {` |
| 186 | `if (rawSqlCreation) {` |
| 205 | `if (businessLogicScore >= this.businessLogicThreshold && !this.isSelfContainedEntityBehavior(method)) {` |
| 225 | `if (isAnemic) {` |
| 245 | `private buildClassMaps(astOutputs: FullASTOutput[]): void {` |
| 250 | `for (const ast of astOutputs) {` |
| 251 | `for (const cls of ast.classes) {` |
| 258 | `if (!this.simpleNameMap.has(simple)) {` |
| 266 | `private resolveTypeName(typeName: string, imports: ImportInfo[], currentPackage?: string): string | null {` |
| 268 | `if (typeName.includes('.')) {` |
| 272 | `for (const imp of imports) {` |
| 273 | `if (imp.simpleName === typeName && !imp.isWildcard) {` |
| 278 | `if (currentPackage) {` |
| 280 | `if (candidates) {` |
| 287 | `if (samePackageCandidates.length === 1) {` |
| 294 | `if (candidates && candidates.size === 1) {` |
| 301 | `private isImproperDependency(typeName: string): boolean {` |
| 306 | `private getDependencyType(typeName: string): string {` |
| 314 | `private isServiceClassName(className: string): boolean {` |
| 318 | `private isRepositoryClassName(className: string): boolean {` |
| 322 | `private isRawSQLType(typeName: string): boolean {` |
| 327 | `private isInfrastructureClassName(className: string): boolean {` |
| 331 | `private isEntityClassName(className: string): boolean {` |
| 335 | `private isSelfContainedEntityBehavior(method: Method): boolean {` |
| 339 | `const createsImproperDependency = (method.createdObjects || []).some(creation =>` |
| 358 | `private isAnemicEntity(cls: ClassInfo): boolean {` |
| 364 | `for (const method of cls.methods) {` |
| 371 | `if (isGetter || isSetter) {` |

## src/extension.ts

Type: TypeScript source  
Lines: 494

| Line | Declaration |
|---:|---|
| 36 | `export async function activate(context: vscode.ExtensionContext) {` |
| 104 | `if (e.affectsConfiguration('javaAstAnalyzer')) {` |
| 133 | `if (editor && editor.document.languageId === 'java') {` |
| 146 | `if (!isHealthy) {` |
| 164 | `if (answer === 'Yes') {` |
| 181 | `if (activeEditor && activeEditor.document.languageId === 'java') {` |
| 215 | `if (event.document.languageId === 'java' && event.contentChanges.length > 0) {` |
| 224 | `if (document.languageId === 'java') {` |
| 232 | `if (!isHealthy) {` |
| 238 | `if (choice === 'Open Settings') {` |
| 248 | `if (autoAnalyze) {` |
| 255 | `async function analyzeFullProject() {` |
| 257 | `if (!workspaceFolders || workspaceFolders.length === 0) {` |
| 285 | `if (token.isCancellationRequested) {` |
| 313 | `async function runAiAdvisory(trigger: 'onDemand' | 'onSave' | 'onFullScan' = 'onSave'): Promise<void> {` |
| 317 | `if (trigger === 'onDemand' || triggerRank(trigger) >= triggerRank(ai.aiTrigger as 'onDemand' | 'onSave' | 'onFullScan')) {` |
| 321 | `if (ai.aiTrigger === 'onDemand' && trigger === 'onDemand') {` |
| 333 | `function triggerRank(t: 'onDemand' | 'onSave' | 'onFullScan'): number {` |
| 338 | `function createAiCoordinator(cfg: vscode.WorkspaceConfiguration): AiAdvisoryCoordinator {` |
| 373 | `async function analyzeSingleFile(document: vscode.TextDocument) {` |
| 380 | `if (workspaceFolders && workspaceFolders.length > 0) {` |
| 383 | `if (ast) {` |
| 396 | `function updateStatusBar(state: string, fileCount?: number, violationCount?: number) {` |
| 397 | `switch (state) {` |
| 418 | `if (vCount > 0) {` |
| 447 | `async function showStatusInfo() {` |
| 464 | `switch (selected.label) {` |
| 486 | `export function deactivate() {` |
| 487 | `if (fileWatcher) {` |
| 490 | `if (outputChannel) {` |

## src/fileWatcher.ts

Type: TypeScript source  
Lines: 200

| Line | Declaration |
|---:|---|
| 7 | `export class FileWatcher {` |
| 33 | `start(context: vscode.ExtensionContext): void {` |
| 59 | `for (const file of event.files) {` |
| 60 | `if (file.newUri.fsPath.endsWith('.java') || file.oldUri.fsPath.endsWith('.java')) {` |
| 63 | `if (file.newUri.fsPath.endsWith('.java')) {` |
| 96 | `onDocumentChanged(document: vscode.TextDocument): void {` |
| 107 | `async onDocumentSaved(document: vscode.TextDocument): Promise<void> {` |
| 111 | `if (existing) {` |
| 127 | `dispose(): void {` |
| 129 | `for (const timer of this.debounceTimers.values()) {` |
| 135 | `for (const d of this.disposables) {` |
| 141 | `private debouncedHandleFileEvent(uri: vscode.Uri, changeType: 'created' | 'changed'): void {` |
| 144 | `if (existing) {` |
| 156 | `private debouncedHandleDocumentChange(document: vscode.TextDocument): void {` |
| 159 | `if (existing) {` |
| 186 | `private async handleFileEvent(uri: vscode.Uri, changeType: 'created' | 'changed'): Promise<void> {` |

## src/fixSuggestionEngine.ts

Type: TypeScript source  
Lines: 215

| Line | Declaration |
|---:|---|
| 5 | `function label(v: Violation): string {` |
| 12 | `function target(v: Violation): string {` |
| 16 | `function fieldLine(v: Violation): number | undefined {` |
| 20 | `function suggestion(` |
| 35 | `function annotationSuggestion(v: Violation, annotation: string, title: string, description: string): RemediationSuggestion | undefined {` |
| 82 | `export class FixSuggestionEngine {` |
| 83 | `enrich(violations: Violation[]): Violation[] {` |
| 87 | `private enrichOne(v: Violation): Violation {` |
| 97 | `private toPreferredQuickFix(suggestions: RemediationSuggestion[]): AiQuickFix | undefined {` |
| 107 | `suggest(v: Violation): RemediationSuggestion[] {` |
| 108 | `switch (v.code) {` |
| 204 | `if (v.code && DESIGN_PATTERN_STEPS[v.code]) {` |

## src/impactAnalyzer.ts

Type: TypeScript source  
Lines: 566

| Line | Declaration |
|---:|---|
| 3 | `export interface InvalidationMaps {` |
| 8 | `export interface AstChangeImpact {` |
| 22 | `export class ImpactAnalyzer {` |
| 27 | `if (!oldAst) {` |
| 88 | `const add = (...items: string[]) => items.forEach(item => rules.add(item));` |
| 90 | `if (impact.importsChanged) {` |
| 93 | `if (impact.fieldsChanged || impact.annotationsChanged) {` |
| 96 | `if (impact.classStructureChanged || impact.publicSignatureChanged) {` |
| 107 | `if (impact.methodCallsChanged) {` |
| 119 | `if (impact.objectCreationsChanged) {` |
| 129 | `if (impact.methodComplexityChanged) {` |
| 156 | `while (queue.length > 0) {` |
| 164 | `for (const dep of upstream) {` |
| 165 | `if (!affected.has(dep)) {` |
| 186 | `for (const [filePath, ast] of Object.entries(files)) {` |
| 188 | `for (const imp of ast.imports || []) {` |
| 189 | `if (!imp.isWildcard && imp.qualifiedName) {` |
| 191 | `if (depFile && depFile !== filePath) {` |
| 196 | `for (const rel of ast.relationships || []) {` |
| 198 | `if (targetFile && targetFile !== filePath) {` |
| 203 | `for (const dep of deps) {` |
| 204 | `if (!dependents.has(dep)) {` |
| 232 | `if (oldDeps) {` |
| 233 | `for (const dep of oldDeps) {` |
| 235 | `if (depSet) {` |
| 245 | `for (const cls of newAst.classes || []) {` |
| 251 | `for (const [fp, ast] of Object.entries(files)) {` |
| 254 | `for (const imp of ast.imports || []) {` |
| 255 | `if (!imp.isWildcard && imp.qualifiedName && definedClasses.has(imp.qualifiedName)) {` |
| 260 | `if (!depends) {` |
| 261 | `for (const rel of ast.relationships || []) {` |
| 263 | `if (definedClasses.has(rel.targetId) || definedClasses.has(simple)) {` |
| 274 | `for (const parent of oldDependents) {` |
| 275 | `if (!newDependents.has(parent)) {` |
| 279 | `for (const parent of newDependents) {` |
| 280 | `if (!oldDependents.has(parent)) {` |
| 285 | `if (newDependents.size > 0) {` |
| 293 | `for (const imp of newAst.imports || []) {` |
| 294 | `if (!imp.isWildcard && imp.qualifiedName) {` |
| 296 | `if (depFile && depFile !== filePath) {` |
| 301 | `for (const rel of newAst.relationships || []) {` |
| 303 | `if (targetFile && targetFile !== filePath) {` |
| 307 | `if (newDeps.size > 0) {` |
| 309 | `for (const dep of newDeps) {` |
| 310 | `if (!maps.dependents.has(dep)) {` |
| 326 | `for (const cls of ast.classes || []) {` |
| 335 | `for (const m of cls.methods || []) {` |
| 336 | `if (m.accessModifier === 'public' || m.accessModifier === 'protected') {` |
| 342 | `for (const f of cls.attributes || []) {` |
| 343 | `if (f.accessModifier === 'public' || f.accessModifier === 'protected') {` |
| 367 | `if (oldDeps) {` |
| 368 | `for (const dep of oldDeps) {` |
| 370 | `if (depSet) {` |
| 377 | `if (oldDependents) {` |
| 378 | `for (const parentFile of oldDependents) {` |
| 380 | `if (parentDeps) {` |
| 393 | `for (const [fp, ast] of Object.entries(files)) {` |
| 395 | `for (const cls of ast.classes || []) {` |
| 396 | `if (cls.fullyQualifiedName === qualifiedName) {` |
| 408 | `for (const [fp, ast] of Object.entries(files)) {` |
| 410 | `for (const cls of ast.classes || []) {` |
| 411 | `if (cls.fullyQualifiedName === className || cls.className === className) {` |
| 474 | `for (const cls of ast.classes || []) {` |
| 476 | `for (const field of cls.attributes || []) {` |
| 479 | `for (const method of cls.methods || []) {` |
| 481 | `for (const param of method.parameters || []) {` |
| 552 | `if (Array.isArray(value)) {` |
| 555 | `if (!value || typeof value !== 'object') {` |

## src/infrastructure/ai/fileAuditLogger.ts

Type: TypeScript source  
Lines: 18

| Line | Declaration |
|---:|---|
| 6 | `export class FileAuditLogger implements AiAuditLogger {` |
| 7 | `constructor(private readonly workspaceRoot: string) {}` |
| 9 | `log(entry: AiAuditLogEntry): void {` |

## src/infrastructure/ai/httpJson.ts

Type: TypeScript source  
Lines: 54

| Line | Declaration |
|---:|---|
| 5 | `export interface HttpJsonOptions {` |
| 12 | `export interface HttpResponse {` |
| 17 | `export function httpRequest(endpoint: string, opts: HttpJsonOptions): Promise<HttpResponse> {` |
| 20 | `if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {` |

## src/infrastructure/ai/ollamaAiAdapter.ts

Type: TypeScript source  
Lines: 81

| Line | Declaration |
|---:|---|
| 7 | `export interface OllamaAdapterOptions {` |
| 12 | `export class OllamaAiAdapter implements AiDecisionProvider {` |
| 19 | `async isAvailable(): Promise<boolean> {` |
| 31 | `async evaluate(context: AiContextPayload): Promise<AiDecision[]> {` |
| 44 | `if (res.status < 200 || res.status >= 300) {` |
| 50 | `private stripSlash(url: string): string {` |
| 60 | `function extractOllamaContent(body: string): string {` |
| 62 | `if (lines.length > 1) {` |
| 64 | `for (const line of lines) {` |

## src/infrastructure/ai/openaiCompatibleAiAdapter.ts

Type: TypeScript source  
Lines: 64

| Line | Declaration |
|---:|---|
| 7 | `export interface OpenAiCompatibleAdapterOptions {` |
| 14 | `export class OpenAICompatibleAiAdapter implements AiDecisionProvider {` |
| 21 | `async isAvailable(): Promise<boolean> {` |
| 34 | `async evaluate(context: AiContextPayload): Promise<AiDecision[]> {` |
| 48 | `if (res.status < 200 || res.status >= 300) {` |
| 57 | `private authHeaders(): Record<string, string> | undefined {` |
| 61 | `private stripSlash(url: string): string {` |

## src/infrastructure/ai/parseDecisions.ts

Type: TypeScript source  
Lines: 42

| Line | Declaration |
|---:|---|
| 7 | `export function parseDecisions(raw: string): AiDecision[] {` |
| 14 | `if (start === -1 || end === -1 || end <= start) {` |
| 23 | `if (!Array.isArray(parsed)) {` |
| 29 | `function normalizeDecision(item: Record<string, unknown>): AiDecision {` |

## src/infrastructure/ai/prompt.ts

Type: TypeScript source  
Lines: 24

| Line | Declaration |
|---:|---|
| 3 | `export interface ChatMessage {` |
| 19 | `export function buildMessages(context: AiContextPayload): ChatMessage[] {` |

## src/infrastructure/apiClientAdapter.ts

Type: TypeScript source  
Lines: 152

| Line | Declaration |
|---:|---|
| 7 | `export class ApiClientAdapter implements BackendService {` |
| 11 | `constructor(baseUrl: string, outputChannel: vscode.OutputChannel) {` |
| 16 | `async checkHealth(): Promise<boolean> {` |
| 26 | `async sendFullAST(projectName: string, workspacePath: string, files: Record<string, any>): Promise<any> {` |
| 52 | `async resetBackend(): Promise<any> {` |
| 56 | `async getFileAST(filePath: string): Promise<any> {` |
| 60 | `async getFiles(): Promise<any> {` |
| 64 | `async getStats(): Promise<any> {` |
| 68 | `async getHistory(limit: number = 50): Promise<any> {` |
| 72 | `private async post(endpoint: string, body: any): Promise<any> {` |
| 116 | `private async get(endpoint: string): Promise<any> {` |

## src/infrastructure/javaParser.ts

Type: TypeScript source  
Lines: 4155

| Line | Declaration |
|---:|---|
| 30 | `export class JavaParser {` |
| 34 | `constructor(outputChannel: vscode.OutputChannel) {` |
| 40 | `parse(sourceCode: string, filePath: string): any {` |
| 56 | `private cstToAst(cst: any, filePath: string, sourceCode: string): FullASTOutput {` |
| 57 | `if (!cst) {` |
| 79 | `for (const cls of classes) {` |
| 81 | `if (!cls.outerClass) {` |
| 82 | `if (cls.classType === 'interface') {` |
| 95 | `for (const cls of classes) {` |
| 100 | `for (const cls of classes) {` |
| 101 | `if (!cls.outerClass) {` |
| 107 | `for (const method of cls.methods) {` |
| 108 | `for (const call of method.calledMethods) {` |
| 109 | `if (call.targetClass && !call.isLibraryCall) {` |
| 118 | `if (!existing) {` |
| 150 | `private createEmptyPackageInfo(filePath: string): PackageInfo {` |
| 165 | `private extractPackageInfo(cst: any, filePath: string): PackageInfo {` |
| 168 | `if (!packageName) {` |
| 191 | `private findPackageDeclaration(node: any): string | null {` |
| 195 | `if (node.name === 'packageDeclaration' && node.children) {` |
| 201 | `if (node.children) {` |
| 202 | `for (const key of Object.keys(node.children)) {` |
| 203 | `if (Array.isArray(node.children[key])) {` |
| 204 | `for (const child of node.children[key]) {` |
| 215 | `private getIdentifierFromNode(node: any): string {` |
| 218 | `if (node.children.Identifier) {` |
| 220 | `for (const id of node.children.Identifier) {` |
| 238 | `if (node.name === 'typeDeclaration' && node.children) {` |
| 239 | `if (node.children.classDeclaration) {` |
| 242 | `if (node.children.interfaceDeclaration) {` |
| 245 | `if (node.children.enumDeclaration) {` |
| 252 | `if (node.children) {` |
| 253 | `for (const key of Object.keys(node.children)) {` |
| 254 | `if (Array.isArray(node.children[key])) {` |
| 255 | `for (const child of node.children[key]) {` |
| 277 | `if (node.children.normalClassDeclaration) {` |
| 283 | `if (node.children.enumDeclaration) {` |
| 289 | `private getClassModifiersFromNode(node: any): string[] {` |
| 292 | `for (const cm of node.children.classModifier) {` |
| 293 | `if (cm.children) {` |
| 308 | `private getAnnotationsFromModifierList(modifiers: any[]): Annotation[] {` |
| 310 | `for (const mod of modifiers) {` |
| 311 | `if (mod.children?.annotation) {` |
| 312 | `for (const ann of mod.children.annotation) {` |
| 350 | `if (superClass) {` |
| 362 | `for (const iface of interfaces) {` |
| 378 | `for (const ann of ncdAnnotations) {` |
| 379 | `if (!allAnnotations.some(a => a.fullyQualifiedName === ann.fullyQualifiedName)) {` |
| 445 | `for (const ctor of constructors) {` |
| 446 | `if (ctor.injectionAssignments) {` |
| 447 | `for (const assign of ctor.injectionAssignments) {` |
| 449 | `if (field) {` |
| 459 | `if (allInjected.length > 0) {` |
| 479 | `for (const attr of fields) {` |
| 480 | `if (this.isCustomType(attr.dataType)) {` |
| 482 | `if (this.isCustomType(baseType)) {` |
| 484 | `if (!hasARelMap.has(key)) {` |
| 489 | `if (attr.isInjected) {` |
| 496 | `for (const [key, entry] of hasARelMap) {` |
| 513 | `if (classBody?.children?.classBodyDeclaration) {` |
| 514 | `for (const cbd of classBody.children.classBodyDeclaration) {` |
| 515 | `if (cbd.children?.classMemberDeclaration) {` |
| 517 | `if (cmd.children?.classDeclaration) {` |
| 522 | `if (innerNcd) {` |
| 531 | `private makeRelation(from: string, to: string, type: Relationship['type'], label: string, metadata?: RelationshipMetadata): Relationship {` |
| 535 | `private extractPermittedSubclasses(node: any): string[] {` |
| 555 | `if (node.children.normalInterfaceDeclaration) {` |
| 560 | `if (node.children.annotationTypeDeclaration) {` |
| 566 | `private processEnumDeclaration(node: any, classes: ClassInfo[], sourceCode: string, filePath: string): void {` |
| 663 | `private extractEnumDetails(node: any, enumName: string, fullyQualifiedName: string, accessModifier: 'public' | 'package-private', sourceC...` |
| 685 | `private extractEnumConstants(node: any): any[] {` |
| 697 | `for (const ec of enumConstantList.children.enumConstant) {` |
| 711 | `private extractEnumConstantArgs(ec: any): any[] {` |
| 722 | `for (const expr of el.children.expression) {` |
| 729 | `private extractExpressionValue(expr: any): any {` |
| 733 | `if (expr.children.stringLiteral) {` |
| 736 | `if (expr.children.integerLiteral) {` |
| 739 | `if (expr.children.floatingPointLiteral) {` |
| 742 | `if (expr.children.booleanLiteral) {` |
| 745 | `if (expr.children.nullLiteral) {` |
| 748 | `if (expr.children.Identifier) {` |
| 755 | `private extractEnumFields(node: any): { name: string; dataType: string }[] {` |
| 762 | `for (const cbd of enumBody.children.classBodyDeclaration) {` |
| 763 | `if (cbd.children?.classMemberDeclaration) {` |
| 765 | `if (cmd.children?.fieldDeclaration) {` |
| 770 | `for (const name of fieldNames) {` |
| 783 | `private extractEnumConstructor(enumName: string): string {` |
| 792 | `private extractEnumMethods(node: any): string[] {` |
| 801 | `for (const cbd of classBodyDecls) {` |
| 803 | `for (const cmd of classMemberDecls) {` |
| 804 | `if (cmd?.children?.methodDeclaration) {` |
| 816 | `private extractMethodNameFromDeclaration(md: any): string {` |
| 817 | `if (md?.children?.methodHeader?.[0]?.children?.methodDeclarator?.[0]?.children?.Identifier) {` |
| 844 | `for (const iface of extendedInterfaces) {` |
| 918 | `private buildFabricatedMethod(name: string, methodType: 'abstract' | 'default' | 'static'): Method {` |
| 942 | `private processAnnotationInterface(node: any, classes: ClassInfo[], sourceCode: string, filePath: string): void {` |
| 993 | `private getTypeIdentifier(node: any): string {` |
| 997 | `if (node.children.typeIdentifier) {` |
| 999 | `if (ti.children?.Identifier) {` |
| 1008 | `private getSuperClass(node: any): string | null {` |
| 1013 | `if (clause.children?.classType?.[0]?.children?.Identifier) {` |
| 1020 | `private getSuperInterfaces(node: any): string[] {` |
| 1023 | `for (const key of clauses) {` |
| 1025 | `if (clause?.children?.interfaceTypeList?.[0]) {` |
| 1032 | `private getExtendsInterfaces(node: any): string[] {` |
| 1034 | `for (const key of clauses) {` |
| 1036 | `if (clause?.children?.interfaceTypeList?.[0]) {` |
| 1043 | `private extractTypeName(node: any): string {` |
| 1046 | `const collectIds = (n: any) => {` |
| 1048 | `if (n.children?.Identifier) {` |
| 1049 | `for (const id of n.children.Identifier) {` |
| 1053 | `if (n.children) {` |
| 1054 | `for (const key of Object.keys(n.children)) {` |
| 1055 | `if (Array.isArray(n.children[key])) {` |
| 1056 | `for (const child of n.children[key]) {` |
| 1068 | `private extractTypeList(node: any): string[] {` |
| 1071 | `const collectTypes = (n: any) => {` |
| 1074 | `if (n.name === 'classType' || n.name === 'interfaceType') {` |
| 1076 | `if (typeName && !types.includes(typeName)) {` |
| 1082 | `if (n.children) {` |
| 1083 | `for (const key of Object.keys(n.children)) {` |
| 1084 | `if (Array.isArray(n.children[key])) {` |
| 1085 | `for (const child of n.children[key]) {` |
| 1097 | `private getEnumConstants(node: any): string[] {` |
| 1108 | `for (const ec of enumConstantList.children.enumConstant) {` |
| 1109 | `if (ec.children?.Identifier) {` |
| 1137 | `if (!node?.children?.classBody) {` |
| 1142 | `if (!classBody?.children?.classBodyDeclaration) {` |
| 1149 | `for (const cbd of classBody.children.classBodyDeclaration) {` |
| 1151 | `if (cbd.name === 'staticInitializer') {` |
| 1152 | `if (cbd.children?.classInitializer) {` |
| 1160 | `if (cbd.name === 'initializer') {` |
| 1167 | `if (cbd.children?.constructorDeclaration) {` |
| 1174 | `if (cbd.children?.classMemberDeclaration) {` |
| 1178 | `if (cmd.children?.fieldDeclaration) {` |
| 1184 | `for (const fieldInfo of fieldInfoList) {` |
| 1194 | `for (const ctor of constructors) {` |
| 1195 | `if (ctor.injectionAssignments) {` |
| 1196 | `for (const assign of ctor.injectionAssignments) {` |
| 1198 | `if (field) {` |
| 1213 | `if (hasLombokAnnotation) {` |
| 1217 | `if (isRequired) {` |
| 1219 | `for (const field of fields) {` |
| 1220 | `if (!field.isInjected && field.isFinal) {` |
| 1227 | `for (const field of fields) {` |
| 1228 | `if (!field.isInjected) {` |
| 1237 | `for (const cbd of classBody.children.classBodyDeclaration) {` |
| 1238 | `if (cbd.children?.classMemberDeclaration) {` |
| 1242 | `if (cmd.children?.methodDeclaration) {` |
| 1250 | `if (cmd.children?.classDeclaration) {` |
| 1253 | `if (innerClassName) {` |
| 1261 | `for (const method of methods) {` |
| 1262 | `if (method.name.startsWith('set') && method.parameters.length === 1) {` |
| 1268 | `if (hasInjectAnnotation) {` |
| 1271 | `if (field && !field.isInjected) {` |
| 1285 | `private extractInitializerBlock(cbd: any): { block: string } | null {` |
| 1369 | `private extractFieldAnnotations(fd: any): Annotation[] {` |
| 1373 | `if (fd.children?.fieldModifier) {` |
| 1374 | `for (const mod of fd.children.fieldModifier) {` |
| 1375 | `if (mod.children?.annotation) {` |
| 1376 | `for (const ann of mod.children.annotation) {` |
| 1387 | `private isInjectionAnnotation(annotations: Annotation[]): boolean {` |
| 1396 | `private processInterfaceBody(node: any): {` |
| 1413 | `if (!node?.children?.interfaceBody) {` |
| 1418 | `if (!interfaceBody?.children?.interfaceMemberDeclaration) {` |
| 1422 | `for (const imd of interfaceBody.children.interfaceMemberDeclaration) {` |
| 1424 | `if (imd.children?.constantDeclaration) {` |
| 1430 | `if (constName) {` |
| 1440 | `if (imd.children?.interfaceMethodDeclaration) {` |
| 1459 | `if (isPrivate) {` |
| 1478 | `private getInterfaceMethodParameterTypes(iMethod: any): string[] {` |
| 1484 | `for (const fp of fpl.children.formalParameter) {` |
| 1490 | `private getFieldModifiers(node: any): string[] {` |
| 1494 | `for (const fm of node.children.fieldModifier) {` |
| 1495 | `if (fm.children) {` |
| 1507 | `private getMethodModifiers(node: any): string[] {` |
| 1514 | `for (const mm of node.children[modKey]) {` |
| 1515 | `if (mm.children) {` |
| 1528 | `private getConstructorModifiers(node: any): string[] {` |
| 1532 | `for (const cm of node.children.constructorModifier) {` |
| 1533 | `if (cm.children) {` |
| 1543 | `private getFieldType(node: any): string {` |
| 1550 | `private extractType(node: any): string {` |
| 1554 | `if (serializedType) {` |
| 1559 | `if (node.children?.unannPrimitiveType) {` |
| 1561 | `if (pt.children?.numericType) {` |
| 1563 | `if (nt.children?.integralType) {` |
| 1571 | `if (nt.children?.floatingPointType) {` |
| 1581 | `if (node.children?.unannReferenceType) {` |
| 1584 | `if (rt.children?.unannClassOrInterfaceType) {` |
| 1589 | `if (typeArgs) {` |
| 1599 | `private serializeTypeNode(node: any): string {` |
| 1607 | `if (images.length === 0) {` |
| 1619 | `private collectTerminalTokens(node: any, tokens: any[]): void {` |
| 1621 | `if (node.image !== undefined) {` |
| 1627 | `for (const key of Object.keys(node.children)) {` |
| 1630 | `for (const child of children) {` |
| 1636 | `private extractClassName(node: any): string {` |
| 1640 | `if (uct.children?.Identifier) {` |
| 1649 | `private extractTypeArguments(node: any): string | null {` |
| 1676 | `private getVariableDeclaratorIds(node: any): string[] {` |
| 1684 | `for (const vd of vdl.children.variableDeclarator) {` |
| 1685 | `if (vd.children?.variableDeclaratorId) {` |
| 1687 | `if (vdi.children?.Identifier) {` |
| 1750 | `if (methodBody) {` |
| 1754 | `if (methodBody.location) {` |
| 1757 | `if (typeof start === 'number' && typeof end === 'number') {` |
| 1772 | `for (const attr of classAttributes) {` |
| 1777 | `for (const param of parameters) {` |
| 1782 | `if (bodyInfo.localVariables) {` |
| 1783 | `for (const local of bodyInfo.localVariables) {` |
| 1828 | `private extractMethodCalls(methodBody: any, symbolTable?: Map<string, { type: string, isInjected: boolean }>): MethodCall[] {` |
| 1834 | `const extractArgumentsFromSuffix = (suffix: any): string[] => {` |
| 1840 | `for (const expr of al.children.expression) {` |
| 1847 | `const collectFqnIdentifiers = (fqnNode: any): string[] => {` |
| 1849 | `const collect = (n: any) => {` |
| 1851 | `if (n.name === 'fqnOrRefTypePartCommon' && n.children?.Identifier) {` |
| 1852 | `for (const id of n.children.Identifier) {` |
| 1856 | `if (n.children) {` |
| 1857 | `for (const key of Object.keys(n.children)) {` |
| 1858 | `if (Array.isArray(n.children[key])) {` |
| 1868 | `const traverse = (node: any) => {` |
| 1872 | `if (node.name === 'primarySuffix' && node.children?.methodInvocationSuffix) {` |
| 1875 | `const findPrimary = (n: any, parent: any): boolean => {` |
| 1876 | `if (n === node) { primaryNode = parent; return true; }` |
| 1877 | `if (n.children) {` |
| 1878 | `for (const key of Object.keys(n.children)) {` |
| 1879 | `if (Array.isArray(n.children[key])) {` |
| 1880 | `for (const c of n.children[key]) {` |
| 1904 | `if (node.name === 'primary') {` |
| 1907 | `if (prefix && suffix && suffix.children?.methodInvocationSuffix) {` |
| 1910 | `if (fqnIdentifiers.length > 0) {` |
| 1922 | `if (firstId && symbolTable) {` |
| 1924 | `if (symbol) {` |
| 1955 | `if (node.name === 'methodCall' && node.children?.methodName) {` |
| 1958 | `if (methodName) {` |
| 1966 | `if (receiver) {` |
| 1970 | `if (varName && symbolTable) {` |
| 1972 | `if (symbol) {` |
| 2000 | `if (node.children) {` |
| 2001 | `for (const key of Object.keys(node.children)) {` |
| 2002 | `if (Array.isArray(node.children[key])) {` |
| 2003 | `for (const child of node.children[key]) {` |
| 2015 | `private getReceiverVariableName(receiver: any): string | undefined {` |
| 2017 | `if (receiver.name === 'Identifier') {` |
| 2020 | `if (receiver.children?.Identifier) {` |
| 2023 | `if (identifiers.length > 0) {` |
| 2028 | `if (receiver.name === 'expressionName' && receiver.children?.Identifier) {` |
| 2034 | `private extractObjectCreationsFromBody(methodBody: any): ObjectCreation[] {` |
| 2042 | `const traverse = (node: any, loopDepth: number = 0) => {` |
| 2045 | `if (node.name === 'newExpression' || node.name === 'objectCreationExpression') {` |
| 2047 | `if (className) {` |
| 2059 | `if (node.children) {` |
| 2060 | `for (const key of Object.keys(node.children)) {` |
| 2061 | `if (Array.isArray(node.children[key])) {` |
| 2062 | `for (const child of node.children[key]) {` |
| 2075 | `private extractCreationArgs(node: any): string[] {` |
| 2077 | `const collectArgs = (n: any): void => {` |
| 2080 | `if (al?.children?.expression) {` |
| 2081 | `for (const expr of al.children.expression) {` |
| 2086 | `if (n.children) {` |
| 2087 | `for (const key of Object.keys(n.children)) {` |
| 2088 | `if (Array.isArray(n.children[key])) {` |
| 2089 | `for (const c of n.children[key]) {` |
| 2102 | `private containsConditionalExpression(node: any): boolean {` |
| 2107 | `if (node.children) {` |
| 2108 | `for (const key of Object.keys(node.children)) {` |
| 2109 | `if (Array.isArray(node.children[key])) {` |
| 2110 | `for (const child of node.children[key]) {` |
| 2127 | `private extractPersistenceWrites(calledMethods: MethodCall[]): PersistenceWrite[] {` |
| 2129 | `for (const call of calledMethods) {` |
| 2141 | `private extractWrittenVariables(methodBody: any): string[] {` |
| 2145 | `const traverse = (node: any) => {` |
| 2147 | `if (node.name === 'localVariableDeclaration') {` |
| 2158 | `if (node.children) {` |
| 2159 | `for (const key of Object.keys(node.children)) {` |
| 2160 | `if (Array.isArray(node.children[key])) {` |
| 2172 | `private collectLhsIdentifiers(node: any): string[] {` |
| 2175 | `const collect = (n: any) => {` |
| 2177 | `if (Array.isArray(n.children?.Identifier)) {` |
| 2178 | `for (const id of n.children.Identifier) {` |
| 2182 | `if (n.children) {` |
| 2183 | `for (const key of Object.keys(n.children)) {` |
| 2184 | `if (Array.isArray(n.children[key])) {` |
| 2194 | `private extractDetailedMethodParameters(header: any, fieldNames: Set<string>): Parameter[] {` |
| 2254 | `if (parameters.length === 0) {` |
| 2269 | `if (explicitConstructorInvocation && explicitConstructorInvocation.length > 0) {` |
| 2271 | `if (eci.children?.this) {` |
| 2321 | `for (const stmt of stmts) {` |
| 2342 | `if (node.name === 'binaryExpression' && node.children?.AssignmentOperator) {` |
| 2348 | `if (lhs) {` |
| 2351 | `if (primary) {` |
| 2354 | `if (prefix?.children?.This && suffix?.children?.Identifier) {` |
| 2359 | `if (!fieldName) {` |
| 2365 | `if (fieldName && fieldNames.has(fieldName) && rhs) {` |
| 2367 | `if (paramName) {` |
| 2369 | `if (paramIdx >= 0) {` |
| 2381 | `if (node.children) {` |
| 2382 | `for (const key of Object.keys(node.children)) {` |
| 2383 | `if (Array.isArray(node.children[key])) {` |
| 2384 | `for (const child of node.children[key]) {` |
| 2392 | `private findChildByName(node: any, name: string): any | null {` |
| 2395 | `if (node.children) {` |
| 2396 | `for (const key of Object.keys(node.children)) {` |
| 2397 | `if (Array.isArray(node.children[key])) {` |
| 2398 | `for (const child of node.children[key]) {` |
| 2408 | `private findFirstIdentifier(node: any): string | null {` |
| 2410 | `if (node.name === 'Identifier' || (node.image && !node.children)) {` |
| 2413 | `if (node.children) {` |
| 2414 | `for (const key of Object.keys(node.children)) {` |
| 2415 | `if (Array.isArray(node.children[key])) {` |
| 2416 | `for (const child of node.children[key]) {` |
| 2426 | `private analyzeConstructorBody(constructorBody: any, parameters: Parameter[]): { calledMethods: MethodCall[]; createdObjects: ObjectCreat...` |
| 2427 | `if (!constructorBody) {` |
| 2438 | `for (const stmt of stmts) {` |
| 2439 | `if (stmt.children?.statement) {` |
| 2444 | `if (callType === 'method' && methodName) {` |
| 2465 | `private getDetailedParameters(declarator: any, fieldNames: Set<string>): Parameter[] {` |
| 2503 | `private extractInterfaceMethod(node: any): any | null {` |
| 2522 | `private getMethodName(header: any): string {` |
| 2529 | `private getSimpleTypeName(node: any): string {` |
| 2533 | `if (stn?.children?.Identifier) {` |
| 2536 | `if (stn?.children?.typeIdentifier) {` |
| 2538 | `if (ti?.children?.Identifier) {` |
| 2545 | `private getReturnType(header: any): string {` |
| 2550 | `if (result.children?.unannType) {` |
| 2557 | `private getMethodParameters(header: any): any[] {` |
| 2568 | `for (const fp of fpl.children.formalParameter) {` |
| 2581 | `private getConstructorParameters(declarator: any): any[] {` |
| 2589 | `for (const fp of fpl.children.formalParameter) {` |
| 2602 | `private getParameterType(fp: any): string {` |
| 2605 | `if (fp?.children?.variableParaRegularParameter) {` |
| 2607 | `if (vprp?.children?.unannType) {` |
| 2611 | `if (!typeNode && fp?.children?.unannType) {` |
| 2619 | `private getParameterModifiers(fp: any): string[] {` |
| 2627 | `if (fp.children?.variableArityParameter) {` |
| 2634 | `private getParameterName(fp: any): string {` |
| 2636 | `if (fp?.children?.variableParaRegularParameter) {` |
| 2639 | `const findId = (n: any): string => {` |
| 2641 | `if (n.children?.variableDeclaratorId) {` |
| 2645 | `if (n.children) {` |
| 2646 | `for (const key of Object.keys(n.children)) {` |
| 2647 | `if (Array.isArray(n.children[key])) {` |
| 2648 | `for (const c of n.children[key]) {` |
| 2662 | `if (fp?.children?.variableDeclaratorId) {` |
| 2669 | `private extractAnnotations(node: any): Annotation[] {` |
| 2677 | `for (const ann of annotationsNode.children.annotation) {` |
| 2679 | `if (fqName) {` |
| 2702 | `private extractAnnotationElements(ann: any): { [key: string]: any } {` |
| 2707 | `for (const evp of ann.children.elementValuePair) {` |
| 2710 | `if (keyNode && valueNode) {` |
| 2720 | `private extractElementValue(node: any): any {` |
| 2724 | `if (node.children?.expression) {` |
| 2727 | `if (node.name === 'stringLiteral') {` |
| 2730 | `if (node.name === 'integerLiteral') {` |
| 2733 | `if (node.name === 'booleanLiteral') {` |
| 2736 | `if (node.name === 'nullLiteral') {` |
| 2739 | `if (node.name === 'Identifier') {` |
| 2745 | `private isBuiltInAnnotation(fqName: string): boolean {` |
| 2759 | `private extractMethodAnnotations(node: any): Annotation[] {` |
| 2763 | `for (const mod of node.children.methodModifier) {` |
| 2764 | `if (mod.children?.annotation) {` |
| 2765 | `for (const ann of mod.children.annotation) {` |
| 2774 | `private extractAnnotation(ann: any): Annotation | null {` |
| 2796 | `private extractParameterAnnotations(fp: any): Annotation[] {` |
| 2801 | `if (vprp?.children?.variableModifier) {` |
| 2802 | `for (const mod of vprp.children.variableModifier) {` |
| 2803 | `if (mod?.children?.annotation) {` |
| 2804 | `for (const ann of mod.children.annotation) {` |
| 2815 | `private extractConstructorAnnotations(node: any): Annotation[] {` |
| 2819 | `if (node?.children?.constructorModifier) {` |
| 2820 | `for (const mod of node.children.constructorModifier) {` |
| 2821 | `if (mod.children?.annotation) {` |
| 2822 | `for (const ann of mod.children.annotation) {` |
| 2833 | `private getAnnotationName(ann: any): string {` |
| 2837 | `if (ann.children.typeName) {` |
| 2841 | `if (ann.children.qualifiedName) {` |
| 2845 | `if (ann.children.annotationName) {` |
| 2852 | `private extractJavaDoc(node: any): string | undefined {` |
| 2858 | `private extractFieldJavaDoc(vd: any): string | undefined {` |
| 2863 | `private getAccessModifier(modifiers: string[]): 'public' | 'private' | 'protected' | 'package-private' {` |
| 2870 | `private extractGenericTypeParameters(node: any): GenericTypeParam[] {` |
| 2873 | `if (node?.children?.typeParameters) {` |
| 2875 | `if (tp?.children?.typeParameterList) {` |
| 2877 | `if (tpl?.children?.typeParameter) {` |
| 2878 | `for (const param of tpl.children.typeParameter) {` |
| 2896 | `private getTypeParameterName(param: any): string {` |
| 2901 | `private getTypeParameterBound(param: any): string | undefined {` |
| 2908 | `private determineVariance(param: any): 'invariant' | 'covariant' | 'contravariant' {` |
| 2919 | `if (!methodBody) {` |
| 2937 | `for (const stmt of stmts) {` |
| 2938 | `if (stmt.children?.statement) {` |
| 2972 | `private getBlockStatements(block: any): any[] {` |
| 2974 | `if (Array.isArray(block.children.blockStatement)) {` |
| 2977 | `if (Array.isArray(block.children.blockStatements)) {` |
| 2984 | `private isStandardLibrary(className: string): boolean {` |
| 2995 | `if (statement.name === 'primary') {` |
| 2998 | `if (suffix?.children?.methodInvocationSuffix) {` |
| 3000 | `if (prefix?.children?.This) { callback('this'); return; }` |
| 3001 | `if (prefix?.children?.Super) { callback('super'); return; }` |
| 3005 | `if (fqnNode) {` |
| 3007 | `if (ids.length > 0) {` |
| 3011 | `if (receiverName) {` |
| 3022 | `if (statement.name === 'methodCall') {` |
| 3023 | `if (statement.children?.methodName) {` |
| 3026 | `if (methodName) {` |
| 3029 | `if (receiver) {` |
| 3035 | `if (statement.children?.primary) {` |
| 3037 | `if (primary.children?.expression) {` |
| 3044 | `if (statement.name === 'newExpression' || statement.name === 'objectCreationExpression') {` |
| 3046 | `if (className) {` |
| 3052 | `if (statement.children) {` |
| 3053 | `for (const key of Object.keys(statement.children)) {` |
| 3054 | `if (Array.isArray(statement.children[key])) {` |
| 3055 | `for (const child of statement.children[key]) {` |
| 3063 | `private collectFqnIdentifiers(fqnNode: any): string[] {` |
| 3065 | `const collect = (n: any) => {` |
| 3067 | `if (n.name === 'fqnOrRefTypePartCommon' && n.children?.Identifier) {` |
| 3068 | `for (const id of n.children.Identifier) {` |
| 3072 | `if (n.children) {` |
| 3073 | `for (const key of Object.keys(n.children)) {` |
| 3074 | `if (Array.isArray(n.children[key])) {` |
| 3084 | `private inferReceiverTypeByName(receiverName: string): string | undefined {` |
| 3087 | `if (/^[A-Z]/.test(firstSegment)) {` |
| 3093 | `private extractSimpleName(node: any): string {` |
| 3095 | `if (node.children?.Identifier) {` |
| 3098 | `if (node.name === 'Identifier') {` |
| 3104 | `private extractReceiver(statement: any): any {` |
| 3106 | `if (statement.children?.primary) {` |
| 3109 | `if (statement.children?.expressionName) {` |
| 3115 | `private inferReceiverType(receiver: any): string | undefined {` |
| 3118 | `if (receiver.name === 'Identifier') {` |
| 3121 | `if (receiver.children?.Identifier) {` |
| 3127 | `private extractCreatedClassName(creation: any): string {` |
| 3129 | `if (creation?.children?.unqualifiedClassInstanceCreationExpression) {` |
| 3132 | `if (citi) {` |
| 3139 | `if (createdName?.children?.Identifier) {` |
| 3146 | `private extractObjectCreations(statement: any): ObjectCreation[] {` |
| 3149 | `const findCreations = (node: any) => {` |
| 3152 | `if (node.name === 'newExpression' || node.name === 'objectCreationExpression') {` |
| 3154 | `if (className) {` |
| 3164 | `if (node.children) {` |
| 3165 | `for (const key of Object.keys(node.children)) {` |
| 3166 | `if (Array.isArray(node.children[key])) {` |
| 3167 | `for (const child of node.children[key]) {` |
| 3180 | `private extractLocalVariables(statement: any): LocalVariable[] {` |
| 3185 | `if (statement.name === 'localVariableDeclaration') {` |
| 3214 | `const findDecls = (n: any) => {` |
| 3216 | `if (n.name === 'localVariableDeclaration') {` |
| 3241 | `if (n.children) {` |
| 3242 | `for (const key of Object.keys(n.children)) {` |
| 3243 | `if (Array.isArray(n.children[key])) {` |
| 3252 | `if (statement.name === 'enhancedForStatement') {` |
| 3254 | `if (loopVar) {` |
| 3273 | `private getLocalVarType(statement: any): string {` |
| 3274 | `if (statement.children?.unannType) {` |
| 3278 | `if (statement.children?.localVariableType) {` |
| 3280 | `if (lvt.children?.unannType) {` |
| 3284 | `if (statement.children?.varType) {` |
| 3290 | `private getLocalVarNames(statement: any): string[] {` |
| 3301 | `private extractEnhancedForVariable(statement: any): LocalVariable | null {` |
| 3324 | `private isCustomType(type: string): boolean {` |
| 3335 | `private extractInitialValue(vd: any): any {` |
| 3344 | `private computeJVMDefault(dataType: string): any {` |
| 3347 | `switch (baseType) {` |
| 3365 | `private hasGetterMethod(fieldName: string, className: string): boolean {` |
| 3371 | `private hasSetterMethod(fieldName: string, className: string): boolean {` |
| 3376 | `private generateGetterName(fieldName: string, accessModifier: string): string {` |
| 3377 | `if (accessModifier === 'boolean' || fieldName.startsWith('is')) {` |
| 3383 | `private generateSetterName(fieldName: string, accessModifier: string): string {` |
| 3387 | `private postProcessFields(fields: Attribute[], methods: (Method | Constructor)[]): void {` |
| 3389 | `for (const field of fields) {` |
| 3393 | `for (const m of methods) {` |
| 3394 | `if (m.name === potentialGetter) {` |
| 3398 | `if (m.name === potentialSetter) {` |
| 3406 | `private extractThrowsClause(node: any): string[] {` |
| 3410 | `if (node?.parent?.children?.methodDeclarator) {` |
| 3412 | `if (md.children?.throws) {` |
| 3414 | `if (throwsNode.children?.exceptionTypeList) {` |
| 3416 | `if (etl.children?.exceptionType) {` |
| 3417 | `for (const et of etl.children.exceptionType) {` |
| 3428 | `private extractExceptionType(et: any): string {` |
| 3429 | `if (et.children?.unannClassOrInterfaceType) {` |
| 3432 | `if (et.children?.unannType) {` |
| 3438 | `private extractChainedConstructorParams(eci: any): string {` |
| 3440 | `if (eci.children?.arguments) {` |
| 3442 | `if (args.children?.expressionList) {` |
| 3449 | `private extractConstructorBody(node: any): string {` |
| 3455 | `private determineMemoryLocation(modifiers: string[]): 'method_area' | 'heap' | 'stack' {` |
| 3460 | `private getSourceFileName(node: any): string | null {` |
| 3465 | `private extractPackageInfoFromSource(sourceCode: string): PackageInfo | null {` |
| 3488 | `private getModifiers(node: any): string[] {` |
| 3494 | `for (const key of modifierKeys) {` |
| 3495 | `if (node.children[key]) {` |
| 3496 | `for (const mod of node.children[key]) {` |
| 3497 | `if (mod.children) {` |
| 3517 | `private extractImports(cst: any): ImportInfo[] {` |
| 3521 | `const traverse = (node: any) => {` |
| 3524 | `if (node.name === 'importDeclaration' && node.children) {` |
| 3529 | `if (node.children) {` |
| 3530 | `for (const key of Object.keys(node.children)) {` |
| 3531 | `if (Array.isArray(node.children[key])) {` |
| 3532 | `for (const child of node.children[key]) {` |
| 3544 | `private parseImportNode(node: any): ImportInfo | null {` |
| 3573 | `private getImportName(node: any): string {` |
| 3579 | `private collectExternalDependencies(cls: ClassInfo, imports: ImportInfo[], ownPackage: string | null): string[] {` |
| 3583 | `for (const attr of cls.attributes) {` |
| 3584 | `if (this.isExternalType(attr.dataType, ownPackage)) {` |
| 3590 | `for (const method of cls.methods) {` |
| 3591 | `if (method.returnType && this.isExternalType(method.returnType, ownPackage)) {` |
| 3594 | `for (const param of method.parameters) {` |
| 3595 | `if (this.isExternalType(param.dataType, ownPackage)) {` |
| 3602 | `for (const ctor of cls.constructors) {` |
| 3603 | `for (const param of ctor.parameters) {` |
| 3604 | `if (this.isExternalType(param.dataType, ownPackage)) {` |
| 3611 | `for (const method of cls.methods) {` |
| 3612 | `for (const call of method.calledMethods) {` |
| 3613 | `if (call.targetClass && this.isExternalType(call.targetClass, ownPackage)) {` |
| 3617 | `for (const creation of method.createdObjects) {` |
| 3618 | `if (this.isExternalType(creation.className, ownPackage)) {` |
| 3625 | `for (const ctor of cls.constructors) {` |
| 3626 | `for (const creation of ctor.createdObjects) {` |
| 3627 | `if (this.isExternalType(creation.className, ownPackage)) {` |
| 3636 | `private isExternalType(typeName: string, ownPackage: string | null): boolean {` |
| 3647 | `if (baseType.startsWith('java.lang.') || baseType === 'String' || baseType === 'Object') {` |
| 3654 | `if (isStandard) {` |
| 3659 | `if (baseType.includes('.')) {` |
| 3668 | `private buildMethodCallGraph(cls: ClassInfo): { [methodName: string]: MethodCall[] } {` |
| 3671 | `for (const method of cls.methods) {` |
| 3675 | `for (const ctor of cls.constructors) {` |
| 3682 | `private classifyClass(cls: ClassInfo): void {` |
| 3693 | `if (annotationNames.includes('FeignClient')) {` |
| 3726 | `if (layer === 'unknown' || namingScore === 0) {` |
| 3729 | `if (name.endsWith('Service') || name.endsWith('Handler') || name.endsWith('Manager') || name.endsWith('Facade')) {` |
| 3746 | `if (namingLayer && layer === 'unknown') {` |
| 3752 | `if (cls.fullyQualifiedName) {` |
| 3755 | `if (parts.includes('controller') || parts.includes('controllers') || parts.includes('api') || parts.includes('resource') || parts.include...` |
| 3774 | `if (pkgLayer && layer === 'unknown') {` |
| 3781 | `if (annotationScore > 0) {` |
| 3793 | `if (layer === 'controller' && cls.methods.some(m => m.calledMethods.some(c => c.targetClass && (c.targetClass.includes('Repository') || c...` |
| 3796 | `if (layer === 'entity' && cls.methods.some(m => m.returnType.includes('Service') || m.returnType.includes('Controller'))) {` |
| 3814 | `private extractLocation(nodeOrToken: any): { startLine?: number, startColumn?: number, endLine?: number, endColumn?: number } | undefined {` |
| 3816 | `if (nodeOrToken.location) {` |
| 3824 | `if (typeof nodeOrToken.startLine === 'number') {` |
| 3835 | `private extractComplexityMetrics(methodBody: any): ComplexityMetrics {` |
| 3845 | `const getLine = (node: any): number => {` |
| 3850 | `const getConditionText = (node: any): string => {` |
| 3852 | `for (const key of Object.keys(node.children)) {` |
| 3853 | `if (Array.isArray(node.children[key])) {` |
| 3854 | `for (const child of node.children[key]) {` |
| 3864 | `const traverse = (node: any, depth: number) => {` |
| 3868 | `if (node.name === 'ifStatement') {` |
| 3876 | `if (elseStmt) {` |
| 3886 | `if (node.name === 'whileStatement') {` |
| 3895 | `if (node.name === 'basicForStatement' || node.name === 'enhancedForStatement') {` |
| 3905 | `if (node.name === 'doStatement') {` |
| 3913 | `if (node.name === 'switchStatement' || node.name === 'switchBlock') {` |
| 3918 | `for (const sg of groups) {` |
| 3920 | `for (const sl of labels) {` |
| 3930 | `if (node.name === 'catchClause') {` |
| 3938 | `if (node.name === 'ternaryExpression' || (node.children?.Question)) {` |
| 3945 | `if (node.children) {` |
| 3946 | `for (const key of Object.keys(node.children)) {` |
| 3947 | `if (Array.isArray(node.children[key])) {` |
| 3948 | `for (const child of node.children[key]) {` |
| 3949 | `if (child.image === '&&' || child.image === '||') {` |
| 3969 | `private extractConditionText(node: any): string {` |
| 3972 | `const collect = (n: any) => {` |
| 3974 | `if (n.image !== undefined) {` |
| 3977 | `if (n.children) {` |
| 3978 | `for (const key of Object.keys(n.children)) {` |
| 3979 | `if (Array.isArray(n.children[key])) {` |
| 3996 | `if (depth === 0) {` |
| 4007 | `private calculateBusinessLogicScore(bodyText: string, linesOfCode: number, complexity: number): number {` |
| 4012 | `const nullCheckEq = (bodyText.match(/==\s*null|null\s*==/g) || []).length;` |
| 4013 | `const nullCheckNe = (bodyText.match(/!=\s*null|null\s*!=/g) || []).length;` |
| 4015 | `const guardIfNull = (bodyText.match(/if\s*\([^)]*null[^)]*\)\s*(return|throw)/g) || []).length;` |
| 4046 | `for (const { re, weight, adjust } of patterns) {` |
| 4048 | `if (matches) {` |
| 4062 | `private extractSuppressedLines(sourceCode: string): Record<number, string[]> {` |
| 4069 | `if (m) {` |
| 4072 | `if (/rica:\s*all/i.test(raw) || /\ball\b/i.test(raw) && raw.toLowerCase().includes('rica')) {` |
| 4077 | `for (const t of tokens) {` |
| 4083 | `for (const t of ricaTokens) {` |
| 4088 | `if (codes.length === 0 && raw.includes('V')) {` |
| 4094 | `if (codes.length > 0) {` |
| 4100 | `if (/rica-disable(?!\s*-\s*next)/i.test(line) && !/rica-disable-next-line/i.test(line)) {` |
| 4112 | `private extractAccessedFields(bodyNode: any, fieldNames: Set<string>): string[] {` |
| 4116 | `const traverse = (node: any) => {` |
| 4119 | `if (node.name === 'primary') {` |
| 4123 | `if (prefix?.children?.This) {` |
| 4124 | `for (const suffix of suffixes) {` |
| 4125 | `if (suffix.children?.Identifier) {` |
| 4133 | `if (node.name === 'Identifier' || node.image) {` |
| 4135 | `if (name && fieldNames.has(name)) {` |
| 4140 | `if (node.children) {` |
| 4141 | `for (const key of Object.keys(node.children)) {` |
| 4142 | `if (Array.isArray(node.children[key])) {` |
| 4143 | `for (const child of node.children[key]) {` |

## src/infrastructure/javaParserAdapter.ts

Type: TypeScript source  
Lines: 16

| Line | Declaration |
|---:|---|
| 5 | `export class JavaParserAdapter implements ParserService {` |
| 6 | `constructor(private readonly parser: JavaParser) {}` |
| 8 | `parse(sourceCode: string, filePath: string): FullASTOutput {` |
| 10 | `if (result && result.error) {` |

## src/infrastructure/vscodeConfigProvider.ts

Type: TypeScript source  
Lines: 47

| Line | Declaration |
|---:|---|
| 5 | `export class VscodeConfigProvider implements ConfigProvider {` |
| 6 | `getConfig(): AnalyzerConfig {` |
| 41 | `onConfigChange(callback: () => void): void {` |

## src/infrastructure/vscodeDiagnosticReporter.ts

Type: TypeScript source  
Lines: 115

| Line | Declaration |
|---:|---|
| 10 | `export class VscodeDiagnosticReporter implements DiagnosticReporter {` |
| 16 | `report(violations: Violation[], ignoredIds: Set<string>): void {` |
| 26 | `for (const v of violations) {` |
| 36 | `for (const [relativePath, vlist] of ruleMap) {` |
| 40 | `for (const [relativePath, vlist] of advisoryMap) {` |
| 41 | `if (this.advisoryCollection) {` |
| 48 | `clear(): void {` |
| 53 | `clearFile(filePath: string): void {` |
| 62 | `function workspaceUri(workspaceFolder: vscode.WorkspaceFolder, relativePath: string): vscode.Uri {` |
| 66 | `function toDiagnostics(vlist: Violation[], advisory: boolean, uri: vscode.Uri): vscode.Diagnostic[] {` |
| 72 | `for (const v of vlist) {` |
| 74 | `switch (v.severity) {` |
| 80 | `if (v.range) {` |
| 95 | `if (v.analysisMetadata) {` |
| 105 | `if (!advisory && v.documentationUrl && /^https?:\/\//i.test(docBase)) {` |

## src/infrastructure/vscodeSourceProvider.ts

Type: TypeScript source  
Lines: 49

| Line | Declaration |
|---:|---|
| 5 | `export class VscodeSourceProvider implements SourceProvider {` |
| 6 | `constructor(private readonly outputChannel?: vscode.OutputChannel) {}` |
| 8 | `getWorkspaceRoot(): string {` |
| 10 | `if (!folders || folders.length === 0) {` |
| 16 | `async findJavaFiles(excludePatterns?: string[]): Promise<string[]> {` |
| 25 | `async readFile(filePath: string): Promise<string> {` |
| 30 | `async readAll(): Promise<SourceFile[]> {` |
| 33 | `for (const filePath of paths) {` |
| 37 | `if (this.outputChannel) {` |
| 41 | `if (this.outputChannel) {` |

## src/javaParser.ts

Type: TypeScript source  
Lines: 2

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/packageBoundaryDetector.ts

Type: TypeScript source  
Lines: 239

| Line | Declaration |
|---:|---|
| 7 | `export interface LayerBoundaryViolation {` |
| 22 | `export class PackageBoundaryAnalyzer {` |
| 25 | `constructor(config?: Partial<AnalyzerConfig>) {` |
| 38 | `analyze(astOutputs: FullASTOutput[], _graph?: ProjectDependencyGraph, classAnnotations?: Map<string, string[]>): LayerBoundaryViolation[] {` |
| 45 | `for (const ast of astOutputs) {` |
| 46 | `for (const cls of ast.classes || []) {` |
| 53 | `for (const fileAst of astOutputs) {` |
| 59 | `for (const imp of (fileAst.imports || [])) {` |
| 65 | `if (targetLayer === 'presentation' && classAnnotations) {` |
| 67 | `if (anns && anns.includes('Component') && !anns.some(a => a === 'Controller' || a === 'RestController')) {` |
| 75 | `if (!allowed.includes(targetLayer)) {` |
| 94 | `for (const relationship of fileAst.relationships || []) {` |
| 125 | `setConfig(config: Partial<AnalyzerConfig>): void {` |
| 129 | `private matchLayer(filePath: string, boundaries: Record<string, LayerBoundary>): string | null {` |
| 131 | `for (const [name, boundary] of Object.entries(boundaries)) {` |
| 132 | `for (const pattern of boundary.packages) {` |
| 133 | `if (this.globMatch(normalized, pattern)) {` |
| 141 | `private matchLayerByFqn(fqn: string, boundaries: Record<string, LayerBoundary>, layers: string[]): string | null {` |
| 150 | `for (const layer of layers) {` |
| 152 | `for (const pattern of boundary.packages) {` |
| 153 | `if (this.globMatch(pkgPath, pattern) || this.globMatch('/' + pkgPath, pattern)) {` |
| 157 | `if (specificity > bestPatternLen) {` |
| 167 | `private globMatch(path: string, pattern: string): boolean {` |
| 181 | `private deduplicate(violations: LayerBoundaryViolation[]): LayerBoundaryViolation[] {` |
| 207 | `toUnifiedViolations(layerViolations: LayerBoundaryViolation[]): Violation[] {` |

## src/projectAnalyzer.ts

Type: TypeScript source  
Lines: 106

| Line | Declaration |
|---:|---|
| 11 | `export interface AnalysisReport {` |
| 29 | `export function analyzeProject(` |
| 39 | `for (const rule of rules) {` |
| 59 | `export function formatReport(report: AnalysisReport): string {` |
| 67 | `if (report.violations.length === 0) {` |
| 72 | `const bySeverity = (sev: string) => report.violations.filter(v => v.severity === sev);` |
| 77 | `if (errors.length > 0) {` |
| 79 | `for (const v of errors) {` |
| 86 | `if (warnings.length > 0) {` |
| 88 | `for (const v of warnings) {` |
| 95 | `if (infos.length > 0) {` |
| 97 | `for (const v of infos) {` |

## src/ricaLayerCheck.ts

Type: TypeScript source  
Lines: 178

| Line | Declaration |
|---:|---|
| 19 | `interface LayerRule {` |
| 39 | `interface ImportViolation {` |
| 48 | `interface ResolvedImport {` |
| 53 | `function getLayerForFile(filePath: string): string | null {` |
| 56 | `for (const [dir, layer] of Object.entries(LAYER_MAP)) {` |
| 57 | `if (parts.includes(dir)) {` |
| 64 | `function resolveImport(` |
| 72 | `for (const ext of ALLOWED_EXTENSIONS) {` |
| 74 | `if (projectFiles.includes(withExt)) {` |
| 80 | `for (const ext of ALLOWED_EXTENSIONS) {` |
| 82 | `if (projectFiles.includes(indexPath)) {` |
| 90 | `function findTsFiles(dir: string): string[] {` |
| 93 | `for (const entry of entries) {` |
| 95 | `if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {` |
| 104 | `function extractImports(content: string): { rawPath: string; line: number }[] {` |
| 116 | `while ((match = localRe.exec(line)) !== null) {` |
| 118 | `if (p) {` |
| 126 | `function check() {` |
| 130 | `for (const file of tsFiles) {` |
| 138 | `for (const imp of imports) {` |
| 149 | `if (!rule.allowedImports.includes(targetLayer)) {` |
| 162 | `if (violations.length === 0) {` |
| 167 | `for (const v of violations) {` |

## src/serviceLayerDetector.ts

Type: TypeScript source  
Lines: 306

| Line | Declaration |
|---:|---|
| 4 | `export interface ServiceLayerViolation {` |
| 18 | `export class ServiceLayerAnalyzer {` |
| 29 | `analyze(astOutputs: FullASTOutput[]): ServiceLayerViolation[] {` |
| 36 | `for (const ast of astOutputs) {` |
| 37 | `for (const cls of ast.classes) {` |
| 38 | `if (cls.detectedLayer !== 'service') {` |
| 48 | `for (const field of cls.attributes) {` |
| 49 | `if (isSpringManaged && this.isRepositoryType(field.dataType) && !field.isInjected) {` |
| 67 | `for (const method of cls.methods) {` |
| 72 | `for (const call of method.calledMethods) {` |
| 88 | `if (isSpringManaged && (isRepoByLayer || isRepoByName)) {` |
| 89 | `if (!call.receiverIsInjected) {` |
| 127 | `for (const creation of method.createdObjects) {` |
| 133 | `if (isSpringManaged && !isDomainCreation && (this.isRepositoryClassName(className) || this.isInfrastructureClassName(className))) {` |
| 153 | `if (this.isAnemicService(cls)) {` |
| 173 | `private buildClassMaps(astOutputs: FullASTOutput[]): void {` |
| 178 | `for (const ast of astOutputs) {` |
| 179 | `for (const cls of ast.classes) {` |
| 186 | `if (!this.simpleNameMap.has(simple)) {` |
| 194 | `private resolveTypeName(typeName: string, imports: ImportInfo[], currentPackage?: string): string | null {` |
| 196 | `if (typeName.includes('.')) {` |
| 200 | `for (const imp of imports) {` |
| 201 | `if (imp.simpleName === typeName && !imp.isWildcard) {` |
| 206 | `if (currentPackage) {` |
| 208 | `if (candidates) {` |
| 215 | `if (samePackageCandidates.length === 1) {` |
| 222 | `if (candidates && candidates.size === 1) {` |
| 229 | `private isRepositoryClassName(className: string): boolean {` |
| 233 | `private isInfrastructureClassName(className: string): boolean {` |
| 237 | `private isRepositoryType(typeName: string): boolean {` |
| 244 | `private isSpringManaged(cls: ClassInfo): boolean {` |
| 252 | `private isAnemicService(cls: ClassInfo): boolean {` |
| 253 | `if (cls.classType !== 'class') {` |
| 259 | `if (concrete.length === 0) {` |
| 263 | `if (concrete.length < 2) {` |
| 269 | `private isTrivialServiceMethod(method: Method): boolean {` |
| 270 | `if (this.isAccessor(method)) {` |
| 273 | `if ((method.createdObjects || []).length > 0) {` |
| 276 | `if ((method.calledMethods || []).length > 1) {` |
| 280 | `if (!body) {` |
| 283 | `if (body.linesOfCode > 5) {` |
| 286 | `if (body.localVariables.length > 3) {` |
| 289 | `if (body.cyclomaticComplexity !== undefined && body.cyclomaticComplexity > 1) {` |
| 292 | `if (body.businessLogicScore !== undefined && body.businessLogicScore > 0) {` |
| 298 | `private isAccessor(method: Method): boolean {` |

## src/test/aiAdvisory.test.js

Type: hand-written test/support file  
Lines: 430

| Line | Declaration |
|---:|---|
| 33 | `const ann = (name, elems = {}) => ({ name, fullyQualifiedName: name, elements: elems });` |
| 34 | `const methodOf = (name, extra = {}) => ({` |
| 48 | `function orderResourceFixture() {` |
| 154 | `const graphFor = (filesMap) => buildGraphFromFiles(filesMap);` |
| 156 | `function sampleViolation(overrides = {}) {` |
| 192 | `for (const p of probes) {` |
| 308 | `function makeCoordinator({ provider, configOverrides, decisions, available = true }) {` |
| 314 | `log(entry) { dummyLogger.logged.push(entry); },` |
| 316 | `const fixedNow = () => new Date('2026-08-16T10:00:00.000Z');` |
| 375 | `for (const adv of result.advisoryViolations) {` |
| 404 | `for (const key of Object.keys(filesMap)) {` |

## src/test/analyzers.test.js

Type: hand-written test/support file  
Lines: 737

| Line | Declaration |
|---:|---|
| 11 | `function parse(code, filePath) {` |
| 15 | `function parseAll(sources) {` |
| 16 | `if (Array.isArray(sources)) {` |
| 90 | `public MyService(SomeRepository someRepository) {` |
| 152 | `if (v) {` |
| 154 | `if (v.lineNumber) {` |
| 188 | `if (total > 100) { return "high"; }` |
| 228 | `if (input == null || input.isEmpty()) { throw new IllegalArgumentException("Invalid"); }` |
| 232 | `if (score > 100) { score = 100; }` |
| 320 | `if (amount.compareTo(BigDecimal.ZERO) <= 0) {` |
| 422 | `if (input == null || input.isEmpty()) { throw new IllegalArgumentException("Invalid"); }` |
| 627 | `if (file.isEmpty()) { return "empty"; }` |
| 645 | `if (id == null || id.isEmpty()) { throw new IllegalArgumentException("Invalid"); }` |

## src/test/crossFile.test.js

Type: hand-written test/support file  
Lines: 301

| Line | Declaration |
|---:|---|
| 9 | `function parse(code, filePath) {` |

## src/test/designPattern.test.js

Type: hand-written test/support file  
Lines: 864

| Line | Declaration |
|---:|---|
| 8 | `function parse(code, filePath) {` |
| 12 | `function analyze(code, config) {` |
| 18 | `function analyzeAll(sources, config) {` |
| 82 | `class OrderService {` |
| 99 | `class OrderService {` |
| 110 | `class OrderService {` |
| 122 | `class OrderService {` |
| 135 | `class OrderService {` |
| 151 | `interface AllInOne {` |
| 163 | `interface SmallIf {` |
| 173 | `interface Iface {` |
| 186 | `interface OrderWriter {` |
| 193 | `class OrderClient {` |
| 208 | `interface OrderWriter {` |
| 215 | `class OrderClient {` |
| 230 | `interface Payable {` |
| 237 | `class Visa implements Payable {` |
| 247 | `class Checkout {` |
| 261 | `class OrderService {` |
| 266 | `if (o.flag) { if (o.second) { repository.saveAndFlush(o); } }` |
| 280 | `class OrderService {` |
| 295 | `class OrderService {` |
| 307 | `class OrderService {` |
| 325 | `class OrderService {` |
| 342 | `class OrderService {` |
| 354 | `class OrderService {` |
| 369 | `class SqlOrderFactory { public Order create() { return new Order(); } }\` },` |
| 371 | `class MongoOrderFactory { public Order create() { return new Order(); } }\` },` |
| 379 | `class OrderFactory { public Order create() { return new Order(); } }\`;` |
| 389 | `class OrderService {` |
| 406 | `class OrderService {` |
| 419 | `class TreeWalker {` |
| 421 | `for (Object child : nodes) {` |
| 422 | `if (node instanceof Folder) {` |
| 423 | `if (child instanceof FileItem) {` |
| 436 | `class Printer {` |
| 448 | `class ReportService {` |
| 450 | `for (Row r : rows) {` |
| 462 | `class ReportService {` |
| 478 | `class One { public void x(Order o) { if (o.getStatus() == PENDING) { approve(o); } } }\` },` |
| 480 | `class Two { public void y(Order o) { if (o.getStatus() == PENDING) { email(o); } } }\` },` |
| 482 | `class Three { public void z(Order o) { if (o.getStatus() == PENDING) { ship(o); } } }\` },` |
| 491 | `class One { public void x(Order o) { if (o.getStatus() == PENDING) { approve(o); } } }\` },` |
| 493 | `class Two { public void y(Order o) { if (o.getStatus() == PENDING) { email(o); } } }\` },` |
| 505 | `class XmlReport {` |
| 512 | `class CsvReport {` |
| 526 | `class A {` |
| 530 | `class B {` |
| 541 | `class CustomerView {` |
| 548 | `class AccountView {` |
| 564 | `class OrderService {` |
| 580 | `class OrderService {` |
| 593 | `class Validator {` |
| 608 | `class Validator {` |
| 624 | `class OrderService {` |
| 637 | `class AppConfig {` |
| 652 | `class OrderService {` |
| 666 | `class OrderService {` |
| 680 | `class OrderService {` |
| 696 | `class OrderService {` |
| 710 | `class OrderController {` |
| 723 | `class DataSourceConfig {` |
| 737 | `class ConnectionProxy implements DataSource {` |
| 744 | `class OrderService {` |
| 758 | `class OrderService {` |
| 844 | `interface Big {` |
| 848 | `class OrderService {` |

## src/test/extension.test.ts

Type: hand-written test/support file  
Lines: 16

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/test/fixSuggestion.test.js

Type: hand-written test/support file  
Lines: 60

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/test/mocks/mockAiDecisionProvider.js

Type: hand-written test/support file  
Lines: 35

| Line | Declaration |
|---:|---|
| 3 | `const createMockAiDecisionProvider = () => {` |

## src/test/packageBoundary.test.js

Type: hand-written test/support file  
Lines: 45

| Line | Declaration |
|---:|---|
| 8 | `function parse(code, filePath) {` |

## src/test/parser.test.js

Type: hand-written test/support file  
Lines: 545

| Line | Declaration |
|---:|---|
| 7 | `function parse(code, filePath) {` |
| 11 | `function findClass(ast, name) {` |
| 114 | `public MyService(SomeRepository someRepository, AnotherService anotherService) {` |
| 145 | `public MyService(AnotherService anotherService) {` |
| 158 | `public PlainClass() {}` |
| 475 | `public LocClass() {` |

## src/test/violationManagerIncremental.test.js

Type: hand-written test/support file  
Lines: 142

| Line | Declaration |
|---:|---|
| 9 | `function makeManager() {` |

## src/types/analyzerConfig.ts

Type: TypeScript source  
Lines: 1

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/types/violations.ts

Type: TypeScript source  
Lines: 1

No class/function/method declarations detected. This file is likely a type re-export, constants-only file, or fixture/support file.

## src/violationCatalog.ts

Type: TypeScript source  
Lines: 1930

| Line | Declaration |
|---:|---|
| 16 | `export type CatalogSeverity = 'error' | 'warning' | 'info';` |
| 17 | `export type CatalogStage = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'fallback';` |
| 18 | `export type CatalogConfigKey =` |
| 23 | `export interface SeverityContext {` |
| 29 | `export interface ViolationDoc {` |
| 72 | `function d(entry: ViolationDoc): ViolationDoc {` |
| 149 | `public OrderService(OrderRepository orderRepository) {` |
| 194 | `public OrderController(OrderService orderService) {` |
| 232 | `public OrderService(OrderRepository repo) { this.repo = repo; }` |
| 241 | `public OrderService(OrderRepository repo) { this.repo = repo; }` |
| 247 | `if (!order.isBelowLimit()) {` |
| 283 | `for (Item i : order.getItems()) {` |
| 284 | `if (i.isDiscounted()) { total += i.getPrice() * 0.9; }` |
| 475 | `public PaymentController(PaymentGateway paymentGateway) {` |
| 521 | `public ExportController(ReportFileService reportFileService) {` |
| 842 | `public ReportController(ReportService reportService) {` |
| 957 | `public OrderController(OrderService orderService) {` |
| 1035 | `class A { B b; }` |
| 1036 | `class B { C c; }` |
| 1037 | `class C { A a; } // cycle!\`,` |
| 1358 | `public Registry() { this.config = Map.of("region", "us-east-1"); }` |
| 1819 | `public OrderService(ConnectionProxy connectionProxy) {` |
| 1853 | `class RedSquare extends Shape { void draw() { /* red square */ } }` |
| 1854 | `class BlueSquare extends Shape { void draw() { /* blue square */ } }` |
| 1855 | `class RedCircle extends Shape { void draw() { /* red circle */ } }` |
| 1856 | `class BlueCircle extends Shape { void draw() { /* blue circle */ } }\`,` |
| 1858 | `class Red implements Color { void apply() { /* red */ } }` |
| 1860 | `class Square extends Shape { Square(Color c){super(c);} void draw(){ color.apply(); /* square */ } }\`,` |
| 1926 | `export function violationDocSlug(code?: string): string | undefined {` |

## src/violationManager.ts

Type: TypeScript source  
Lines: 656

| Line | Declaration |
|---:|---|
| 92 | `function confidenceForSeverity(severity: Violation['severity']): 'High' | 'Medium' | 'Low' {` |
| 98 | `function analysisTypeFor(source: Violation['detectorSource'], code: string): string {` |
| 101 | `if (source === 'PackageBoundaryAnalyzer' || source === 'CrossFileAnalyzer' || source === 'GraphAnalyzer' || code.startsWith('RICA-V4') ||...` |
| 107 | `function evidenceForLayerViolation(` |
| 120 | `function layerViolationToUnified(` |
| 155 | `export class ViolationManager {` |
| 219 | `if (initialIgnoredIds) {` |
| 236 | `private applyBusinessLogicThreshold(): void {` |
| 243 | `public ignoreViolation(id: string): void {` |
| 245 | `if (this.onIgnoreChanged) {` |
| 251 | `public unignoreViolation(id: string): void {` |
| 253 | `if (this.onIgnoreChanged) {` |
| 259 | `public isIgnored(id: string): boolean {` |
| 263 | `public getIgnoredIds(): string[] {` |
| 268 | `private refreshDiagnostics(): void {` |
| 273 | `public setOnViolationsChanged(callback?: () => void): void {` |
| 281 | `public markFileDirty(filePath: string): void {` |
| 291 | `public onFileSaved(filePath: string, fileContent: string): void {` |
| 310 | `if (!oldAst) {` |
| 315 | `if (!impact.anySemanticChange) {` |
| 323 | `if (graphInputsChanged) {` |
| 329 | `if (graphInputsChanged || impact.publicSignatureChanged || impact.annotationsChanged) {` |
| 330 | `for (const dependent of ImpactAnalyzer.computeBlastRadius(filePath, this.graphMaps)) {` |
| 351 | `if (packageInputsChanged) {` |
| 370 | `if (this.config.enableDesignPatternChecks && localDesignPatternRules.length > 0) {` |
| 378 | `if (this.config.enableDesignPatternChecks && projectDesignPatternRules.length > 0) {` |
| 394 | `if (selectedDesignPatternRules.has(v.legacyType || '') && v.detectorSource === 'DesignPatternAnalyzer') {` |
| 416 | `private deduplicate(violations: Violation[]): Violation[] {` |
| 426 | `public update(): void {` |
| 431 | `for (const ast of allAsts) {` |
| 432 | `if (ast.filePath) {` |
| 451 | `if (allAsts.length > 0) {` |
| 453 | `for (const ast of allAsts) {` |
| 454 | `if (ast.filePath) {` |
| 470 | `if (this.config.enableDesignPatternChecks) {` |
| 480 | `private withFixSuggestions(violations: Violation[]): Violation[] {` |
| 489 | `public onFileDeleted(filePath: string): void {` |
| 495 | `public seedCache(asts: FullASTOutput[]): void {` |
| 496 | `for (const ast of asts) {` |
| 497 | `if (ast.filePath) {` |
| 504 | `public seedFileCache(filePath: string, ast: FullASTOutput): void {` |
| 509 | `public getActiveViolations(): Violation[] {` |
| 514 | `public getDeterministicViolations(): Violation[] {` |
| 519 | `public getAdvisoryViolations(): Violation[] {` |
| 524 | `public getFilesMap(): Record<string, FullASTOutput> {` |
| 529 | `public setAdvisoryViolations(list: Violation[]): void {` |
| 535 | `public getProjectGraph(): ProjectDependencyGraph {` |
| 540 | `public getActiveViolationsSummary(): ViolationSummary {` |
| 544 | `for (const v of this.activeViolations) {` |
| 545 | `switch (v.severity) {` |
| 555 | `public getViolationsBySource(source: Violation['detectorSource']): Violation[] {` |
| 560 | `public getViolationsBySeverity(severity: Violation['severity']): Violation[] {` |
| 565 | `private filterByConfig(violations: Violation[]): Violation[] {` |
| 579 | `if (architecturalSources.includes(v.detectorSource) && !this.config.enableArchitecturalChecks) {` |
| 582 | `if (v.legacyType && designPatternTypes.has(v.legacyType) && !this.config.enableDesignPatternChecks) {` |
| 585 | `if (v.legacyType && businessLogicTypes.has(v.legacyType) && !this.config.enableBusinessLogicChecks) {` |
| 592 | `private isSuppressed(v: Violation): boolean {` |
| 607 | `const matchAnnotation = (anns: any[] | undefined): boolean => {` |
| 609 | `for (const a of anns) {` |
| 623 | `for (const cls of ast.classes) {` |
| 627 | `for (const m of cls.methods) {` |
| 635 | `public clear(): void {` |
| 645 | `private buildClassAnnotationsMap(): Map<string, string[]> {` |
| 647 | `for (const ast of Object.values(this.filesMap)) {` |
| 648 | `for (const cls of ast.classes) {` |

## src/violationsWebviewPanel.ts

Type: TypeScript source  
Lines: 490

| Line | Declaration |
|---:|---|
| 7 | `export class ViolationsWebviewPanel {` |
| 19 | `if (ViolationsWebviewPanel.currentPanel) {` |
| 38 | `private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, violationManager: ViolationManager) {` |
| 48 | `switch (message.command) {` |
| 50 | `if (message.filePath) {` |
| 52 | `if (workspaceFolders && workspaceFolders.length > 0) {` |
| 56 | `if (relative.startsWith('..') || path.isAbsolute(relative)) {` |
| 73 | `if (message.url) {` |
| 78 | `if (message.id) {` |
| 84 | `if (message.id) {` |
| 98 | `public async refresh() {` |
| 102 | `public dispose() {` |
| 106 | `while (this._disposables.length) {` |
| 112 | `private _update() {` |
| 119 | `private _getHtmlContent(violations: Violation[], ignoredIds: string[]): string {` |
| 248 | `function escapeAttr(s) {` |
| 253 | `function showNotif(msg, explanation) {` |
| 261 | `function hideNotif() {` |
| 265 | `function renderAnalysis(v) {` |
| 267 | `if (!meta.confidence && !meta.evidence && !meta.reason && !meta.type) {` |
| 279 | `function renderTable() {` |
| 292 | `if (searchVal) {` |
| 305 | `if (sortKey === 'severity') {` |
| 329 | `if (ignoredSet[violations[i].id] === true) {` |
| 345 | `if (filteredRows.length === 0) {` |
| 365 | `if (!isIgnored && v.documentationUrl) {` |
| 387 | `function toggleIgnore(idx) {` |
| 398 | `function unignoreSeverity(severity) {` |
| 400 | `if (violations[i].severity === severity && ignoredSet[violations[i].id] === true) {` |
| 406 | `function openViolationFile(idx) {` |
| 408 | `if (v && v.filePath) {` |
| 414 | `function openDocs(idx) {` |
| 416 | `if (v && v.documentationUrl) {` |
| 422 | `function firstStep(fix) {` |
| 427 | `function openDocsHome() {` |
| 431 | `function sortBy(key) {` |
| 440 | `function clearFilters() {` |
| 459 | `private _renderSourceOptions(violations: Violation[]): string {` |
| 472 | `for (const v of violations) {` |
| 482 | `private _escapeHtml(value: string): string {` |

## src/webviewPanel.ts

Type: TypeScript source  
Lines: 429

| Line | Declaration |
|---:|---|
| 4 | `export class ASTWebviewPanel {` |
| 15 | `if (ASTWebviewPanel.currentPanel) {` |
| 34 | `private constructor(panel: vscode.WebviewPanel, apiClient: ApiClient) {` |
| 44 | `switch (message.command) {` |
| 68 | `public async refresh() {` |
| 72 | `public dispose() {` |
| 75 | `while (this._disposables.length) {` |
| 81 | `private _update() {` |
| 86 | `private _getHtmlContent(): string {` |
| 270 | `function refresh() {` |
| 275 | `function selectFile(filePath) {` |
| 282 | `function renderFileList() {` |
| 298 | `function renderAST(ast) {` |
| 301 | `if (viewMode === 'json') {` |
| 309 | `function buildTreeHTML(node, depth) {` |
| 313 | `if (Array.isArray(node)) {` |
| 350 | `if (typeof val === 'object' && val !== null) {` |
| 362 | `function tog(id) {` |
| 369 | `function expandAll() {` |
| 376 | `function collapseAll() {` |
| 383 | `function toggleView() {` |
| 389 | `function escapeHtml(text) {` |
| 397 | `switch (msg.command) {` |
| 399 | `if (msg.data?.files) {` |
| 406 | `if (msg.data?.ast) {` |
| 411 | `if (msg.data) {` |

## Compiled JavaScript Outputs

These files are generated from matching `.ts` files by `npm run compile`. They are used by VS Code/package runtime, but the TypeScript source is the version to study and explain.

| Generated file | Source file |
|---|---|
| `src/apiClient.js` | `src/apiClient.ts` |
| `src/apiResourceLayerDetector.js` | `src/apiResourceLayerDetector.ts` |
| `src/application/ai/aiAdvisoryCoordinator.js` | `src/application/ai/aiAdvisoryCoordinator.ts` |
| `src/application/ai/contextBuilder.js` | `src/application/ai/contextBuilder.ts` |
| `src/application/ai/heuristicAdvisor.js` | `src/application/ai/heuristicAdvisor.ts` |
| `src/application/ai/triage.js` | `src/application/ai/triage.ts` |
| `src/application/ports/aiAuditLogger.js` | `src/application/ports/aiAuditLogger.ts` |
| `src/application/ports/aiDecisionProvider.js` | `src/application/ports/aiDecisionProvider.ts` |
| `src/application/ports/analyzerService.js` | `src/application/ports/analyzerService.ts` |
| `src/application/ports/backendService.js` | `src/application/ports/backendService.ts` |
| `src/application/ports/configProvider.js` | `src/application/ports/configProvider.ts` |
| `src/application/ports/diagnosticReporter.js` | `src/application/ports/diagnosticReporter.ts` |
| `src/application/ports/parserService.js` | `src/application/ports/parserService.ts` |
| `src/application/ports/sourceProvider.js` | `src/application/ports/sourceProvider.ts` |
| `src/astManager.js` | `src/astManager.ts` |
| `src/astTypes.js` | `src/astTypes.ts` |
| `src/codeActionProvider.js` | `src/codeActionProvider.ts` |
| `src/controllerLayerDetector.js` | `src/controllerLayerDetector.ts` |
| `src/crossFileAnalyzer.js` | `src/crossFileAnalyzer.ts` |
| `src/dependencyGraph.js` | `src/dependencyGraph.ts` |
| `src/designPatternAnalyzer.js` | `src/designPatternAnalyzer.ts` |
| `src/detectorUtils.js` | `src/detectorUtils.ts` |
| `src/documentation.js` | `src/documentation.ts` |
| `src/documentationCodeActionProvider.js` | `src/documentationCodeActionProvider.ts` |
| `src/domain/ai.js` | `src/domain/ai.ts` |
| `src/domain/analyzerConfig.js` | `src/domain/analyzerConfig.ts` |
| `src/domain/astTypes.js` | `src/domain/astTypes.ts` |
| `src/domain/violations.js` | `src/domain/violations.ts` |
| `src/entityLayerDetector.js` | `src/entityLayerDetector.ts` |
| `src/extension.js` | `src/extension.ts` |
| `src/fileWatcher.js` | `src/fileWatcher.ts` |
| `src/fixSuggestionEngine.js` | `src/fixSuggestionEngine.ts` |
| `src/impactAnalyzer.js` | `src/impactAnalyzer.ts` |
| `src/infrastructure/ai/fileAuditLogger.js` | `src/infrastructure/ai/fileAuditLogger.ts` |
| `src/infrastructure/ai/httpJson.js` | `src/infrastructure/ai/httpJson.ts` |
| `src/infrastructure/ai/ollamaAiAdapter.js` | `src/infrastructure/ai/ollamaAiAdapter.ts` |
| `src/infrastructure/ai/openaiCompatibleAiAdapter.js` | `src/infrastructure/ai/openaiCompatibleAiAdapter.ts` |
| `src/infrastructure/ai/parseDecisions.js` | `src/infrastructure/ai/parseDecisions.ts` |
| `src/infrastructure/ai/prompt.js` | `src/infrastructure/ai/prompt.ts` |
| `src/infrastructure/apiClientAdapter.js` | `src/infrastructure/apiClientAdapter.ts` |
| `src/infrastructure/javaParser.js` | `src/infrastructure/javaParser.ts` |
| `src/infrastructure/javaParserAdapter.js` | `src/infrastructure/javaParserAdapter.ts` |
| `src/infrastructure/vscodeConfigProvider.js` | `src/infrastructure/vscodeConfigProvider.ts` |
| `src/infrastructure/vscodeDiagnosticReporter.js` | `src/infrastructure/vscodeDiagnosticReporter.ts` |
| `src/infrastructure/vscodeSourceProvider.js` | `src/infrastructure/vscodeSourceProvider.ts` |
| `src/javaParser.js` | `src/javaParser.ts` |
| `src/packageBoundaryDetector.js` | `src/packageBoundaryDetector.ts` |
| `src/projectAnalyzer.js` | `src/projectAnalyzer.ts` |
| `src/ricaLayerCheck.js` | `src/ricaLayerCheck.ts` |
| `src/serviceLayerDetector.js` | `src/serviceLayerDetector.ts` |
| `src/types/analyzerConfig.js` | `src/types/analyzerConfig.ts` |
| `src/types/violations.js` | `src/types/violations.ts` |
| `src/violationCatalog.js` | `src/violationCatalog.ts` |
| `src/violationManager.js` | `src/violationManager.ts` |
| `src/violationsWebviewPanel.js` | `src/violationsWebviewPanel.ts` |
| `src/webviewPanel.js` | `src/webviewPanel.ts` |
