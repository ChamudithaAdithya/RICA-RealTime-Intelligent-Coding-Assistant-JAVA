export interface LayerBoundary {
  packages: string[];
  allowedDeps: string[];
}

export interface AnalyzerConfig {
  enableArchitecturalChecks: boolean;
  enableDesignPatternChecks: boolean;
  enableBusinessLogicChecks: boolean;
  businessLogicThreshold: number;
  constructionStatementLimit?: number;
  fatInterfaceMethodLimit?: number;
  missingCommandComplexityThreshold?: number;
  crossCuttingCallLimit?: number;
  stateMachineClassLimit?: number;
  notifierTargetLimit?: number;
  guardClauseLimit?: number;
  nullCheckLimit?: number;
  templateMethodSimilarity?: number;
  excludePatterns: string[];
  layerBoundaries: Record<string, LayerBoundary>;
}

export const DEFAULT_LAYER_BOUNDARIES: Record<string, LayerBoundary> = {
  domain: { packages: ['**/domain/**', '**/entity/**', '**/dto/**', '**/enum/**'], allowedDeps: [] },
  application: { packages: ['**/application/**', '**/service/**', '**/useCase/**'], allowedDeps: ['domain', 'infrastructure'] },
  infrastructure: { packages: ['**/infrastructure/**', '**/dao/**', '**/repository/**', '**/adapter/**', '**/config/**', '**/feign/**', '**/feignClient/**'], allowedDeps: ['domain', 'application'] },
  presentation: { packages: ['**/controller/**', '**/view/**', '**/ui/**', '**/presentation/**'], allowedDeps: ['domain', 'application'] },
};
