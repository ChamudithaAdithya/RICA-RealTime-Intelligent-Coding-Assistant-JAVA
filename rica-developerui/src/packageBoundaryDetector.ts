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
          });
        }
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
    for (const layer of layers) {
      const boundary = boundaries[layer];
      for (const pattern of boundary.packages) {
        if (this.globMatch(pkgPath, pattern) || this.globMatch('/' + pkgPath, pattern)) {
          return layer;
        }
      }
    }
    return null;
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
      const key = `${v.filePath}:${v.lineNumber || 0}:${v.sourceLayer}→${v.targetLayer}:${v.targetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  toUnifiedViolations(layerViolations: LayerBoundaryViolation[]): Violation[] {
    return layerViolations.map(v => ({
      id: `rica-v501-${v.className}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ruleName: 'Package Boundary Violation',
      severity: v.severity,
      message: v.message,
      filePath: v.filePath,
      lineNumber: v.lineNumber,
      code: 'RICA-V501',
      range: v.range,
      mitigationHint: `Restructure the dependency: '${v.sourceLayer}' must not depend on '${v.targetLayer}'. Move the type '${v.targetType}' or invert the dependency.`,
      explanation: `Clean Architecture: inner layers must not depend on outer layers. ${v.sourceLayer} → ${v.targetLayer} violates the Dependency Rule.`,
      contextMetadata: {
        sourceLayer: v.sourceLayer,
        targetLayer: v.targetLayer,
        targetComponent: v.targetType,
      },
      legacyType: 'package-violation',
      detectorSource: 'PackageBoundaryAnalyzer',
      documentationUrl: violationDocSlug('RICA-V501'),
    }));
  }
}
