export interface LayerBoundary {
  packages: string[];
  allowedDeps: string[];
}

export interface AiConfig {
  enableAiAdvisory: boolean;
  aiProvider: 'off' | 'ollama' | 'openai-compatible';
  aiEndpoint: string;
  aiModel: string;
  aiMaxTokensPerRequest: number;
  aiTimeoutMs: number;
  aiMaxCandidatesPerRun: number;
  aiTrigger: 'onDemand' | 'onSave' | 'onFullScan';
  aiAuditLogEnabled: boolean;
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
  bridgeHierarchyThreshold?: number;
  excludePatterns: string[];
  layerBoundaries: Record<string, LayerBoundary>;
  ai: AiConfig;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enableAiAdvisory: false,
  aiProvider: 'ollama',
  aiEndpoint: 'http://localhost:11434',
  aiModel: 'qwen2.5-coder:7b',
  aiMaxTokensPerRequest: 2000,
  aiTimeoutMs: 30000,
  aiMaxCandidatesPerRun: 8,
  aiTrigger: 'onDemand',
  aiAuditLogEnabled: true,
};

export const DEFAULT_LAYER_BOUNDARIES: Record<string, LayerBoundary> = {
  domain: { packages: ['**/domain/**', '**/entity/**', '**/dto/**', '**/enum/**', '**/model/**'], allowedDeps: [] },
  application: { packages: ['**/application/**', '**/service/**', '**/useCase/**'], allowedDeps: ['domain', 'infrastructure'] },
  infrastructure: { packages: ['**/infrastructure/**', '**/dao/**', '**/repository/**', '**/adapter/**', '**/config/**', '**/feign/**', '**/feignClient/**'], allowedDeps: ['domain', 'application'] },
  presentation: { packages: ['**/controller/**', '**/view/**', '**/ui/**', '**/presentation/**'], allowedDeps: ['domain', 'application'] },
};
