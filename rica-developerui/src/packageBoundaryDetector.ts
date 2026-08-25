import { FullASTOutput, ImportInfo } from './astTypes';
import { Violation, DiagnosticRange } from './domain/violations';
import { ProjectDependencyGraph } from './dependencyGraph';
import { AnalyzerConfig, DEFAULT_AI_CONFIG, LayerBoundary, DEFAULT_LAYER_BOUNDARIES } from './domain/analyzerConfig';
import { violationDocSlug } from './violationCatalog';

export interface LayerBoundaryViolation {
  type: 'package-violation';
  message: string;
  className: string;
  filePath: string;
  lineNumber?: number;
  range?: DiagnosticRange;
  severity: 'error' | 'warning' | 'info';
  sourceLayer: string;
  targetLayer: string;
  targetType: string;
  allowedDeps: string[];
  evidence: string;
}

export class PackageBoundaryAnalyzer {
  private config: AnalyzerConfig;

  constructor(config?: Partial<AnalyzerConfig>) {
    this.config = {
      enableArchitecturalChecks: true,
      enableDesignPatternChecks: true,
      enableBusinessLogicChecks: true,
      businessLogicThreshold: 3,
      excludePatterns: [],
      layerBoundaries: { ...DEFAULT_LAYER_BOUNDARIES },
      ai: { ...DEFAULT_AI_CONFIG },
      ...config,
    };
  }

  analyze(astOutputs: FullASTOutput[], _graph?: ProjectDependencyGraph, classAnnotations?: Map<string, string[]>): LayerBoundaryViolation[] {
    const violations: LayerBoundaryViolation[] = [];
    const boundaries = this.config.layerBoundaries;
    if (!boundaries) return violations;

    const layers = Object.keys(boundaries);
    const classesByName = new Map<string, string[]>();
    for (const ast of astOutputs) {
      for (const cls of ast.classes || []) {
        const existing = classesByName.get(cls.className) || [];
        existing.push(cls.fullyQualifiedName);
        classesByName.set(cls.className, existing);
      }
    }

    for (const fileAst of astOutputs) {
      const filePath = fileAst.filePath || '';
      const fileLayer = this.matchLayer(filePath, boundaries);

      if (!fileLayer) continue;

      for (const imp of (fileAst.imports || [])) {
        const targetLayer = this.matchLayerByFqn(imp.qualifiedName, boundaries, layers);
        if (!targetLayer) continue;

        // If the target is in a controller package but annotated @Component (not @Controller/@RestController),
        // treat it as a generic component, not a controller-layer class.
        if (targetLayer === 'presentation' && classAnnotations) {
          const anns = classAnnotations.get(imp.qualifiedName);
          if (anns && anns.includes('Component') && !anns.some(a => a === 'Controller' || a === 'RestController')) {
            continue;
          }
        }

        const allowed = boundaries[fileLayer].allowedDeps;
        if (targetLayer === fileLayer) continue;

        if (!allowed.includes(targetLayer)) {
          violations.push({
            type: 'package-violation',
            message: `Layer '${fileLayer}' should not depend on layer '${targetLayer}'. Allowed deps: [${allowed.join(', ')}]`,
            className: filePath,
            filePath: filePath,
            lineNumber: imp.line,
            severity: 'error',
            sourceLayer: fileLayer,
            targetLayer: targetLayer,
            targetType: imp.qualifiedName,
            allowedDeps: [...allowed],
            evidence: `import ${imp.qualifiedName}`,
          });
        }
      }

      // Imports are insufficient for same-package references and wildcard
      // imports. Relationships carry the resolved usage site when available.
      for (const relationship of fileAst.relationships || []) {
        if (!fileAst.classes.some(cls => cls.fullyQualifiedName === relationship.sourceId)) continue;
        const targetFqn = this.resolveRelationshipTarget(
          relationship.targetId,
          fileAst.packageInfo?.name || '',
          classesByName,
        );
        if (!targetFqn) continue;
        const targetLayer = this.matchLayerByFqn(targetFqn, boundaries, layers);
        if (!targetLayer || targetLayer === fileLayer) continue;
        const allowed = boundaries[fileLayer].allowedDeps;
        if (allowed.includes(targetLayer)) continue;
        violations.push({
          type: 'package-violation',
          message: `Layer '${fileLayer}' should not depend on layer '${targetLayer}'. Allowed deps: [${allowed.join(', ')}]`,
          className: filePath,
          filePath,
          lineNumber: relationship.metadata?.line,
          severity: 'error',
          sourceLayer: fileLayer,
          targetLayer,
          targetType: targetFqn,
          allowedDeps: [...allowed],
          evidence: `reference ${relationship.targetId}`,
        });
      }
    }

    return this.deduplicate(violations);
  }

  setConfig(config: Partial<AnalyzerConfig>): void {
    Object.assign(this.config, config);
  }

  private matchLayer(filePath: string, boundaries: Record<string, LayerBoundary>): string | null {
    const normalized = filePath.replace(/\\/g, '/');
    for (const [name, boundary] of Object.entries(boundaries)) {
      for (const pattern of boundary.packages) {
        if (this.globMatch(normalized, pattern)) {
          return name;
        }
      }
    }
    return null;
  }

  private matchLayerByFqn(fqn: string, boundaries: Record<string, LayerBoundary>, layers: string[]): string | null {
    const pkgPath = fqn.replace(/\./g, '/');
    // Prefer the MOST SPECIFIC layer match (longest matching package pattern).
    // This avoids false cross-layer violations when packages overlap, e.g. a class
    // in `com.example.domain` importing `com.example.domain.dto` - both match the
    // `domain` pattern `**/domain/**` AND the `dto` pattern `**/dto/**`. The longest
    // pattern wins so `domain.dto` is classified as `dto`, not `domain`.
    let bestLayer: string | null = null;
    let bestPatternLen = -1;
    for (const layer of layers) {
      const boundary = boundaries[layer];
      for (const pattern of boundary.packages) {
        if (this.globMatch(pkgPath, pattern) || this.globMatch('/' + pkgPath, pattern)) {
          // Use the pattern's literal length (after stripping glob chars) as a
          // specificity proxy - longer = more specific.
          const specificity = pattern.replace(/\*\*/g, '').replace(/\*/g, '').length;
          if (specificity > bestPatternLen) {
            bestPatternLen = specificity;
            bestLayer = layer;
          }
        }
      }
    }
    return bestLayer;
  }

  private globMatch(path: string, pattern: string): boolean {
    const regexStr = '^' + pattern
      .replace(/\*\*/g, '___DOUBLESTAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLESTAR___/g, '.*')
      .replace(/\?/g, '.')
      + '$';
    try {
      return new RegExp(regexStr).test(path);
    } catch {
      return path.includes(pattern.replace(/\*\*/g, '').replace(/\*/g, ''));
    }
  }

  private deduplicate(violations: LayerBoundaryViolation[]): LayerBoundaryViolation[] {
    const seen = new Set<string>();
    return violations.filter(v => {
      const key = `${v.filePath}:${v.lineNumber || 0}:${v.sourceLayer}->${v.targetLayer}:${v.targetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private resolveRelationshipTarget(
    targetId: string,
    ownPackage: string,
    classesByName: Map<string, string[]>,
  ): string | null {
    const normalized = targetId.replace(/<.*>/g, '').trim();
    if (!normalized) return null;
    if (normalized.includes('.')) return normalized;
    const samePackage = classesByName.get(normalized)?.filter(fqn =>
      fqn.substring(0, fqn.lastIndexOf('.')) === ownPackage
    ) || [];
    if (samePackage.length === 1) return samePackage[0];
    const candidates = classesByName.get(normalized) || [];
    return candidates.length === 1 ? candidates[0] : null;
  }

  toUnifiedViolations(layerViolations: LayerBoundaryViolation[]): Violation[] {
    // Deterministic ID: same violation always produces the same ID so that
    // "ignore" persists across analysis runs (Date.now()/random() made IDs
    // unstable and ignored findings reappeared on every re-analysis).
    return layerViolations.map(v => ({
      id: `RICA-V501-${v.filePath}-${v.lineNumber || 0}-${v.sourceLayer}-${v.targetLayer}-${v.targetType}`,
      ruleName: 'Package Boundary Violation',
      severity: v.severity,
      message: v.message,
      filePath: v.filePath,
      lineNumber: v.lineNumber,
      code: 'RICA-V501',
      range: v.range,
      mitigationHint: `Restructure the dependency: '${v.sourceLayer}' must not depend on '${v.targetLayer}'. Move the type '${v.targetType}' or invert the dependency.`,
      explanation: `Clean Architecture: inner layers must not depend on outer layers. ${v.sourceLayer} -> ${v.targetLayer} violates the Dependency Rule.`,
      contextMetadata: {
        sourceLayer: v.sourceLayer,
        targetLayer: v.targetLayer,
        targetComponent: v.targetType,
      },
      analysisMetadata: {
        confidence: 'High',
        evidence: v.evidence,
        reason: `${v.sourceLayer} layer depends on ${v.targetLayer} layer, but allowed dependencies are [${v.allowedDeps.join(', ')}].`,
        type: 'Architecture best-practice violation',
      },
      legacyType: 'package-violation',
      detectorSource: 'PackageBoundaryAnalyzer',
      documentationUrl: violationDocSlug('RICA-V501'),
    }));
  }
}
