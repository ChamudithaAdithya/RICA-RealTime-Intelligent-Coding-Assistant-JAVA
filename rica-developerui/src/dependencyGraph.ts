import {
    FullASTOutput, ClassInfo, Relationship, ImportInfo,
    RelationshipMetadata, MethodCall, ObjectCreation
} from './astTypes';

export interface GraphNode {
    id: string;
    type: 'file' | 'class' | 'interface' | 'enum';
    metadata: {
        layer?: string;
        filePath: string;
        packageName: string;
        simpleName: string;
    };
}

export interface GraphEdgeLocation {
    line: number;
    context: string;
    sourceFile: string;
}

export interface GraphEdge {
    source: string;
    target: string;
    type: 'imports' | 'extends' | 'implements' | 'has-a' | 'uses' | 'calls' | 'instantiates' | 'inner-class';
    weight: number;
    locations: GraphEdgeLocation[];
}

export interface Violation {
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    sourceId: string;
    targetId?: string;
    filePath: string;
    line?: number;
    layerContext?: string;
    explanation?: string;
}

export class ProjectDependencyGraph {
    nodes: Map<string, GraphNode> = new Map();
    edges: GraphEdge[] = [];

    addNode(id: string, type: GraphNode['type'], metadata: GraphNode['metadata']): boolean {
        if (this.nodes.has(id)) return false;
        this.nodes.set(id, { id, type, metadata });
        return true;
    }

    getNode(id: string): GraphNode | undefined {
        return this.nodes.get(id);
    }

    ensureNode(id: string, type: GraphNode['type'], metadata: GraphNode['metadata']): void {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, { id, type, metadata });
        }
    }

    addEdge(source: string, target: string, type: GraphEdge['type'], location?: GraphEdgeLocation): void {
        const existing = this.edges.find(e =>
            e.source === source && e.target === target && e.type === type
        );
        if (existing) {
            existing.weight++;
            if (location && !existing.locations.some(l => l.line === location.line && l.sourceFile === location.sourceFile)) {
                existing.locations.push(location);
            }
            return;
        }
        this.edges.push({
            source,
            target,
            type,
            weight: 1,
            locations: location ? [location] : []
        });
    }

    resolveTypeFQN(simpleName: string, fileImports: ImportInfo[], ownPackage: string): string | null {
        const baseName = simpleName.replace(/<.*>/g, '').trim();
        if (!baseName) return null;

        // Check if already fully qualified
        if (baseName.includes('.') && this.nodes.has(baseName)) {
            return baseName;
        }

        // Search imports for matching simple name
        for (const imp of fileImports) {
            if (imp.simpleName === baseName && !imp.isWildcard) {
                return imp.qualifiedName;
            }
        }

        // Check wildcard imports: try to resolve to existing nodes
        for (const imp of fileImports) {
            if (imp.isWildcard) {
                const pkgPrefix = imp.qualifiedName.replace(/\.\*$/, '');
                const candidate = `${pkgPrefix}.${baseName}`;
                if (this.nodes.has(candidate)) {
                    return candidate;
                }
                // Check if any node's simple name matches in this package
                for (const [nid] of this.nodes) {
                    const parts = nid.split('.');
                    const simple = parts[parts.length - 1];
                    const pkg = parts.slice(0, -1).join('.');
                    if (simple === baseName && pkg === pkgPrefix) {
                        return nid;
                    }
                }
            }
        }

        // Same-package fallback
        const samePackageCandidate = `${ownPackage}.${baseName}`;
        if (this.nodes.has(samePackageCandidate)) {
            return samePackageCandidate;
        }

        // java.lang fallback (common types without imports)
        const javaLang = `java.lang.${baseName}`;
        if (this.nodes.has(javaLang)) {
            return javaLang;
        }

        // Search ALL nodes by simple name match
        for (const [nid] of this.nodes) {
            const parts = nid.split('.');
            const simple = parts[parts.length - 1];
            if (simple === baseName) {
                return nid;
            }
        }

        return null;
    }

    getIncomingEdges(nodeId: string): GraphEdge[] {
        return this.edges.filter(e => e.target === nodeId);
    }

    getOutgoingEdges(nodeId: string): GraphEdge[] {
        return this.edges.filter(e => e.source === nodeId);
    }

    /** Structural dependency edge types that count toward fan-in/fan-out. */
    private static readonly COUPLING_EDGES = new Set(['calls', 'has-a', 'uses', 'extends', 'implements']);

    /**
     * Fan-in: number of distinct class/interface nodes that structurally
     * depend on `nodeId` (incoming coupling). Excludes file-level nodes and
     * non-coupling edges (imports, instantiates, inner-class).
     */
    getFanIn(nodeId: string): number {
        const dependents = new Set<string>();
        for (const edge of this.edges) {
            if (!ProjectDependencyGraph.COUPLING_EDGES.has(edge.type)) continue;
            if (edge.target !== nodeId) continue;
            const node = this.nodes.get(edge.source);
            if (node && (node.type === 'class' || node.type === 'interface')) dependents.add(edge.source);
        }
        return dependents.size;
    }

    /**
     * Fan-out: number of distinct class/interface nodes that `nodeId`
     * structurally depends on (outgoing coupling).
     */
    getFanOut(nodeId: string): number {
        const dependencies = new Set<string>();
        for (const edge of this.edges) {
            if (!ProjectDependencyGraph.COUPLING_EDGES.has(edge.type)) continue;
            if (edge.source !== nodeId) continue;
            const node = this.nodes.get(edge.target);
            if (node && (node.type === 'class' || node.type === 'interface')) dependencies.add(edge.target);
        }
        return dependencies.size;
    }

    findNodesByLayer(layer: string): GraphNode[] {
        const result: GraphNode[] = [];
        for (const node of this.nodes.values()) {
            if (node.metadata.layer === layer) {
                result.push(node);
            }
        }
        return result;
    }

    findNodesBySimpleName(name: string): GraphNode[] {
        const result: GraphNode[] = [];
        for (const node of this.nodes.values()) {
            if (node.metadata.simpleName === name) {
                result.push(node);
            }
        }
        return result;
    }

    /** Build adjacency list for class/interface nodes using structural dependency edges. */
    private buildClassAdjacency(): Map<string, string[]> {
        const adj = new Map<string, string[]>();
        for (const [id, node] of this.nodes) {
            if (node.type === 'class' || node.type === 'interface') {
                adj.set(id, []);
            }
        }
        const depTypes = new Set(['calls', 'has-a', 'uses', 'extends', 'implements']);
        for (const edge of this.edges) {
            if (depTypes.has(edge.type) && adj.has(edge.source) && adj.has(edge.target)) {
                adj.get(edge.source)!.push(edge.target);
            }
        }
        return adj;
    }

    /**
     * Tarjan's SCC algorithm — single linear pass O(V + E).
     * Returns only non-trivial components (size > 1) which represent true cycles.
     */
    findSCCs(): string[][] {
        const adj = this.buildClassAdjacency();
        const indexMap = new Map<string, number>();
        const lowLink = new Map<string, number>();
        const onStack = new Set<string>();
        const stack: string[] = [];
        const sccs: string[][] = [];
        let index = 0;

        const strongConnect = (v: string) => {
            indexMap.set(v, index);
            lowLink.set(v, index);
            index++;
            stack.push(v);
            onStack.add(v);

            const neighbors = adj.get(v) || [];
            for (const w of neighbors) {
                if (!indexMap.has(w)) {
                    strongConnect(w);
                    lowLink.set(v, Math.min(lowLink.get(v)!, lowLink.get(w)!));
                } else if (onStack.has(w)) {
                    lowLink.set(v, Math.min(lowLink.get(v)!, indexMap.get(w)!));
                }
            }

            if (lowLink.get(v) === indexMap.get(v)) {
                const component: string[] = [];
                let w: string;
                do {
                    w = stack.pop()!;
                    onStack.delete(w);
                    component.push(w);
                } while (w !== v);
                if (component.length > 1) {
                    sccs.push(component);
                }
            }
        };

        for (const [id] of adj) {
            if (!indexMap.has(id)) {
                strongConnect(id);
            }
        }

        return sccs;
    }

    /**
     * BFS-based reachability check — returns true if `target` is reachable from `source`
     * following structural dependency edges (calls, has-a, uses, extends, implements).
     * @param maxHops optional depth limit to distinguish direct vs transitive
     */
    reachable(source: string, target: string, maxHops?: number): boolean {
        if (source === target) return true;
        const adj = this.buildClassAdjacency();
        const visited = new Set<string>();
        const queue: { id: string; depth: number }[] = [{ id: source, depth: 0 }];
        visited.add(source);

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (maxHops !== undefined && depth >= maxHops) continue;
            for (const neighbor of adj.get(id) || []) {
                if (neighbor === target) return true;
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, depth: depth + 1 });
                }
            }
        }
        return false;
    }

    /**
     * Returns all class/interface nodes reachable from `source` via structural edges.
     * @param maxHops optional depth limit
     */
    reachableFrom(source: string, maxHops?: number): string[] {
        const adj = this.buildClassAdjacency();
        const visited = new Set<string>();
        const queue: { id: string; depth: number }[] = [{ id: source, depth: 0 }];
        visited.add(source);

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (maxHops !== undefined && depth >= maxHops) continue;
            for (const neighbor of adj.get(id) || []) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, depth: depth + 1 });
                }
            }
        }

        visited.delete(source);
        return Array.from(visited);
    }
}

export function buildGraphFromFiles(files: Record<string, FullASTOutput>): ProjectDependencyGraph {
    const graph = new ProjectDependencyGraph();

    // Pass 1: Register all file + class nodes
    for (const [filePath, ast] of Object.entries(files)) {
        const pkgName = ast.packageInfo?.name || '';

        graph.addNode(filePath, 'file', {
            filePath,
            packageName: pkgName,
            simpleName: filePath.split(/[/\\]/).pop() || filePath
        });

        for (const cls of ast.classes) {
            graph.addNode(cls.fullyQualifiedName, cls.classType === 'interface' ? 'interface' : 'class', {
                layer: cls.detectedLayer,
                filePath,
                packageName: pkgName,
                simpleName: cls.className
            });
        }
    }

    // Pass 2: Build edges from imports
    for (const [filePath, ast] of Object.entries(files)) {
        const pkgName = ast.packageInfo?.name || '';

        for (const imp of ast.imports) {
            const targetNodeId = imp.isWildcard ? imp.qualifiedName.replace(/\.\*$/, '') : imp.qualifiedName;

            // Try to link file -> imported target
            if (!imp.isWildcard) {
                // Check if the target exists as a class node or we can infer it
                graph.ensureNode(targetNodeId, 'class', {
                    filePath: '',
                    packageName: targetNodeId.includes('.') ? targetNodeId.split('.').slice(0, -1).join('.') : '',
                    simpleName: targetNodeId.split('.').pop() || targetNodeId
                });

                graph.addEdge(filePath, targetNodeId, 'imports', {
                    line: imp.line || 0,
                    context: `import ${imp.qualifiedName}`,
                    sourceFile: filePath
                });
            }
        }

        // Build edges from class relationships
        for (const cls of ast.classes) {
            for (const rel of ast.relationships) {
                if (rel.sourceId === cls.fullyQualifiedName) {
                    const targetId = resolveEdgeTarget(rel.targetId, graph, ast.imports, pkgName);
                    if (targetId) {
                        graph.ensureNode(targetId, 'class', {
                            filePath: '',
                            packageName: targetId.includes('.') ? targetId.split('.').slice(0, -1).join('.') : '',
                            simpleName: targetId.split('.').pop() || targetId
                        });
                        graph.addEdge(cls.fullyQualifiedName, targetId, rel.type, {
                            line: rel.metadata?.line || 0,
                            context: `${rel.type}: ${targetId}`,
                            sourceFile: filePath
                        });
                    }
                }
            }

            // Build 'uses' edges from method call targets that aren't already covered
            for (const method of cls.methods) {
                for (const call of method.calledMethods) {
                    if (call.targetClass && !call.isLibraryCall) {
                        const resolved = graph.resolveTypeFQN(call.targetClass, ast.imports, pkgName);
                        if (resolved && resolved !== cls.fullyQualifiedName) {
                            graph.addEdge(cls.fullyQualifiedName, resolved, 'calls', {
                                line: call.lineNumber || 0,
                                context: `${method.name} calls ${call.targetMethod || call.calledMethodName}`,
                                sourceFile: filePath
                            });
                        }
                    }
                }
            }

            // Build 'instantiates' edges from object creation
            for (const method of cls.methods) {
                for (const creation of method.createdObjects) {
                    const resolved = graph.resolveTypeFQN(creation.className, ast.imports, pkgName);
                    if (resolved) {
                        graph.addEdge(cls.fullyQualifiedName, resolved, 'instantiates', {
                            line: creation.lineNumber || 0,
                            context: `${method.name} instantiates ${creation.className}`,
                            sourceFile: filePath
                        });
                    }
                }
            }
        }
    }

    return graph;
}

export function addFileToGraph(
    graph: ProjectDependencyGraph,
    filePath: string,
    ast: FullASTOutput,
): void {
    const pkgName = ast.packageInfo?.name || '';

    graph.addNode(filePath, 'file', {
        filePath,
        packageName: pkgName,
        simpleName: filePath.split(/[/\\]/).pop() || filePath
    });

    for (const cls of ast.classes) {
        graph.addNode(cls.fullyQualifiedName, cls.classType === 'interface' ? 'interface' : 'class', {
            layer: cls.detectedLayer,
            filePath,
            packageName: pkgName,
            simpleName: cls.className
        });
    }
}

export function removeFileFromGraph(
    graph: ProjectDependencyGraph,
    filePath: string,
): void {
    const nodeIdsToRemove: string[] = [];

    // Collect all node IDs belonging to this file
    for (const [id, node] of graph.nodes) {
        if (node.metadata.filePath === filePath) {
            nodeIdsToRemove.push(id);
        }
    }

    // Remove edges referencing these nodes
    graph.edges = graph.edges.filter(e =>
        !nodeIdsToRemove.includes(e.source) && !nodeIdsToRemove.includes(e.target)
    );

    // Remove the nodes
    for (const id of nodeIdsToRemove) {
        graph.nodes.delete(id);
    }
}

export function patchGraphForFile(
    graph: ProjectDependencyGraph,
    filePath: string,
    oldAst: FullASTOutput | undefined,
    newAst: FullASTOutput,
    allFiles: Record<string, FullASTOutput>,
): void {
    // Remove old nodes/edges for this file
    removeFileFromGraph(graph, filePath);

    // Add new nodes for the file
    addFileToGraph(graph, filePath, newAst);

    // Rebuild edges for this file (imports, relationships, calls, instantiations)
    const pkgName = newAst.packageInfo?.name || '';
    for (const imp of newAst.imports) {
        const targetNodeId = imp.isWildcard ? imp.qualifiedName.replace(/\.\*$/, '') : imp.qualifiedName;
        if (!imp.isWildcard) {
            graph.ensureNode(targetNodeId, 'class', {
                filePath: '',
                packageName: targetNodeId.includes('.') ? targetNodeId.split('.').slice(0, -1).join('.') : '',
                simpleName: targetNodeId.split('.').pop() || targetNodeId
            });
            graph.addEdge(filePath, targetNodeId, 'imports', {
                line: imp.line || 0,
                context: `import ${imp.qualifiedName}`,
                sourceFile: filePath
            });
        }
    }

    for (const cls of newAst.classes) {
        for (const rel of newAst.relationships) {
            if (rel.sourceId === cls.fullyQualifiedName) {
                const targetId = resolveEdgeTarget(rel.targetId, graph, newAst.imports, pkgName);
                if (targetId) {
                    graph.ensureNode(targetId, 'class', {
                        filePath: '',
                        packageName: targetId.includes('.') ? targetId.split('.').slice(0, -1).join('.') : '',
                        simpleName: targetId.split('.').pop() || targetId
                    });
                    graph.addEdge(cls.fullyQualifiedName, targetId, rel.type, {
                        line: rel.metadata?.line || 0,
                        context: `${rel.type}: ${targetId}`,
                        sourceFile: filePath
                    });
                }
            }
        }

        for (const method of cls.methods) {
            for (const call of method.calledMethods) {
                if (call.targetClass && !call.isLibraryCall) {
                    const resolved = graph.resolveTypeFQN(call.targetClass, newAst.imports, pkgName);
                    if (resolved && resolved !== cls.fullyQualifiedName) {
                        graph.addEdge(cls.fullyQualifiedName, resolved, 'calls', {
                            line: call.lineNumber || 0,
                            context: `${method.name} calls ${call.targetMethod || call.calledMethodName}`,
                            sourceFile: filePath
                        });
                    }
                }
            }

            for (const creation of method.createdObjects) {
                const resolved = graph.resolveTypeFQN(creation.className, newAst.imports, pkgName);
                if (resolved) {
                    graph.addEdge(cls.fullyQualifiedName, resolved, 'instantiates', {
                        line: creation.lineNumber || 0,
                        context: `${method.name} instantiates ${creation.className}`,
                        sourceFile: filePath
                    });
                }
            }
        }
    }
}

function resolveEdgeTarget(targetId: string, graph: ProjectDependencyGraph, imports: ImportInfo[], ownPackage: string): string | null {
    // Already fully qualified and known
    if (graph.nodes.has(targetId)) return targetId;

    // Try import resolution
    const baseName = targetId.replace(/<.*>/g, '').trim();
    if (!baseName || baseName === 'Object') return null;

    // Check if it's a known FQN containing dots
    if (baseName.includes('.')) {
        return baseName;
    }

    // Try import-based resolution
    const resolved = graph.resolveTypeFQN(baseName, imports, ownPackage);
    if (resolved) return resolved;

    // Fallback: just use the name as-is (will be an unresolved external node)
    return baseName;
}

export interface AnalyzerRule {
    id: string;
    name: string;
    severity: 'error' | 'warning' | 'info';
    analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[];
}

// Rule A: Controller Layer Bypass (Direct-to-DB Leakage)
export const controllerBypassRule: AnalyzerRule = {
    id: 'LAYER_BYPASS',
    name: 'Controller bypasses business layer',
    severity: 'error',
    analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[] {
        const violations: Violation[] = [];
        const controllers = graph.findNodesByLayer('controller');
        const repositories = graph.findNodesByLayer('repository');

        const repoIds = new Set(repositories.map(r => r.id));

        for (const ctrl of controllers) {
            const outgoing = graph.getOutgoingEdges(ctrl.id);
            for (const edge of outgoing) {
                if ((edge.type === 'calls' || edge.type === 'has-a' || edge.type === 'uses') && repoIds.has(edge.target)) {
                    for (const loc of edge.locations) {
                        violations.push({
                            ruleId: 'LAYER_BYPASS',
                            severity: 'error',
                            message: `Controller "${ctrl.metadata.simpleName}" directly accesses Repository "${edge.target.split('.').pop()}" — should go through a Service layer`,
                            sourceId: ctrl.id,
                            targetId: edge.target,
                            filePath: loc.sourceFile || ctrl.metadata.filePath,
                            line: loc.line,
                            layerContext: 'controller',
                            explanation: 'A controller should not directly access a repository. All database access should go through the Service layer to maintain separation of concerns and business logic consistency.'
                        });
                    }
                }
            }
        }
        return violations;
    }
};

// Rule B: Inverted/Cyclic Dependency Detection
export const cyclicDependencyRule: AnalyzerRule = {
    id: 'CYCLIC_DEP',
    name: 'Cyclic or inverted dependency',
    severity: 'error',
    analyze(graph: ProjectDependencyGraph, _files: Record<string, FullASTOutput>): Violation[] {
        const violations: Violation[] = [];

        // Detect inverted dependencies: lower layers depending on higher layers
        const layerOrder = ['entity', 'repository', 'dto', 'service', 'controller', 'view'];
        const layerRank = new Map<string, number>();
        layerOrder.forEach((l, i) => layerRank.set(l, i));

        for (const edge of graph.edges) {
            if (edge.type === 'calls' || edge.type === 'has-a' || edge.type === 'uses') {
                const sourceNode = graph.getNode(edge.source);
                const targetNode = graph.getNode(edge.target);
                if (sourceNode?.metadata.layer && targetNode?.metadata.layer) {
                    const sourceRank = layerRank.get(sourceNode.metadata.layer) ?? -1;
                    const targetRank = layerRank.get(targetNode.metadata.layer) ?? -1;
                    if (sourceRank < targetRank && targetRank >= 0 && sourceRank >= 0) {
                        for (const loc of edge.locations) {
                            violations.push({
                                ruleId: 'INVERTED_DEP',
                                severity: 'warning',
                                message: `Inverted dependency: "${sourceNode.metadata.simpleName}" (${sourceNode.metadata.layer}) depends on "${targetNode.metadata.simpleName}" (${targetNode.metadata.layer})`,
                                sourceId: edge.source,
                                targetId: edge.target,
                                filePath: loc.sourceFile || sourceNode.metadata.filePath,
                                line: loc.line,
                                layerContext: sourceNode.metadata.layer,
                                explanation: 'Two or more classes depend on each other, creating a circular dependency. This makes the code harder to test, maintain, and reason about.'
                            });
                        }
                    }
                }
            }
        }

        // Detect cycles using Tarjan's SCC (single linear pass)
        const sccs = graph.findSCCs();
        for (const component of sccs) {
            const cycleStr = component.map(id => id.split('.').pop()).join(' → ');
            const firstNode = graph.getNode(component[0]);
            violations.push({
                ruleId: 'CYCLIC_DEP',
                severity: 'error',
                message: `Circular dependency found: ${cycleStr}`,
                sourceId: component[0],
                filePath: firstNode?.metadata.filePath || '',
                layerContext: firstNode?.metadata.layer,
                explanation: 'Two or more classes depend on each other, creating a circular dependency. This makes the code harder to test, maintain, and reason about.'
            });
        }

        return violations;
    }
};

// Rule C: Entity Exposure (DTO leakage)
export const entityExposureRule: AnalyzerRule = {
    id: 'ENTITY_EXPOSURE',
    name: 'Internal entity exposed in API boundary',
    severity: 'warning',
    analyze(graph: ProjectDependencyGraph, files: Record<string, FullASTOutput>): Violation[] {
        const violations: Violation[] = [];

        // Collect entity class FQNs
        const entityNodes = graph.findNodesByLayer('entity');
        const entityIds = new Set(entityNodes.map(n => n.id));
        const entitySimpleNames = new Set(entityNodes.map(n => n.metadata.simpleName));

        // Also detect entities from @Entity annotation
        for (const [, ast] of Object.entries(files)) {
            for (const cls of ast.classes) {
                if (cls.annotations?.some(a => a.name === 'Entity')) {
                    entityIds.add(cls.fullyQualifiedName);
                    entitySimpleNames.add(cls.className);
                }
            }
        }

        for (const [, ast] of Object.entries(files)) {
            for (const cls of ast.classes) {
                if (cls.detectedLayer !== 'controller') continue;

                for (const method of cls.methods) {
                    if (method.accessModifier !== 'public') continue;

                    // Check return type
                    const retBase = method.returnType.replace(/<.*>/g, '').trim();
                    if (entityIds.has(retBase) || entitySimpleNames.has(retBase)) {
                        violations.push({
                            ruleId: 'ENTITY_EXPOSURE',
                            severity: 'warning',
                            message: `Controller "${cls.className}.${method.name}()" returns Entity type "${method.returnType}" — should use a DTO`,
                            sourceId: cls.fullyQualifiedName,
                            filePath: ast.filePath,
                            line: method.startLine,
                            layerContext: 'controller',
                            explanation: 'Returning entity classes directly from controllers exposes internal persistence details. Use Data Transfer Objects (DTOs) to decouple the API contract from the data model.'
                        });
                    }

                    // Check parameter types for entity leakage
                    for (const param of method.parameters) {
                        const paramBase = param.dataType.replace(/<.*>/g, '').trim();
                        if (entityIds.has(paramBase) || entitySimpleNames.has(paramBase)) {
                            violations.push({
                                ruleId: 'ENTITY_EXPOSURE',
                                severity: 'warning',
                                message: `Controller "${cls.className}.${method.name}()" accepts Entity type "${param.dataType}" as parameter — should use a DTO`,
                                sourceId: cls.fullyQualifiedName,
                                filePath: ast.filePath,
                                line: param.startLine,
                                layerContext: 'controller',
                                explanation: 'Returning entity classes directly from controllers exposes internal persistence details. Use Data Transfer Objects (DTOs) to decouple the API contract from the data model.'
                            });
                        }
                    }
                }

                // Also check for public fields of entity type
                for (const attr of cls.attributes) {
                    if (attr.accessModifier === 'public' || attr.accessModifier === 'protected') {
                        const attrBase = attr.dataType.replace(/<.*>/g, '').trim();
                        if (entityIds.has(attrBase) || entitySimpleNames.has(attrBase)) {
                            violations.push({
                                ruleId: 'ENTITY_EXPOSURE',
                                severity: 'info',
                                message: `Controller "${cls.className}" exposes Entity type "${attr.dataType}" via ${attr.accessModifier} field "${attr.name}"`,
                                sourceId: cls.fullyQualifiedName,
                                filePath: ast.filePath,
                                line: attr.startLine,
                                layerContext: 'controller',
                                explanation: 'Returning entity classes directly from controllers exposes internal persistence details. Use Data Transfer Objects (DTOs) to decouple the API contract from the data model.'
                            });
                        }
                    }
                }
            }
        }

        return violations;
    }
};

// Rule D: Cross-layer violation detection (service → controller, etc.)
export const crossLayerViolationRule: AnalyzerRule = {
    id: 'CROSS_LAYER',
    name: 'Cross-layer dependency violation',
    severity: 'warning',
    analyze(graph: ProjectDependencyGraph, _files: Record<string, FullASTOutput>): Violation[] {
        const violations: Violation[] = [];

        const forbiddenEdges: [string, string][] = [
            ['service', 'controller'],
            ['entity', 'controller'],
            ['entity', 'service'],
            ['repository', 'controller'],
            ['repository', 'view'],
        ];

        for (const [fromLayer, toLayer] of forbiddenEdges) {
            const fromNodes = graph.findNodesByLayer(fromLayer);
            const toIds = new Set(graph.findNodesByLayer(toLayer).map(n => n.id));

            for (const node of fromNodes) {
                const outgoing = graph.getOutgoingEdges(node.id);
                for (const edge of outgoing) {
                    if (toIds.has(edge.target) && (edge.type === 'calls' || edge.type === 'has-a' || edge.type === 'uses')) {
                        for (const loc of edge.locations) {
                            violations.push({
                                ruleId: 'CROSS_LAYER',
                                severity: 'warning',
                                message: `"${node.metadata.simpleName}" (${fromLayer}) should not depend on "${edge.target.split('.').pop()}" (${toLayer})`,
                                sourceId: node.id,
                                targetId: edge.target,
                                filePath: loc.sourceFile || node.metadata.filePath,
                                line: loc.line,
                                layerContext: fromLayer,
                                explanation: 'A class in a lower layer is depending on a class in a higher layer. Dependencies should flow from high-level layers down to low-level layers.'
                            });
                        }
                    }
                }
            }
        }

        return violations;
    }
};
