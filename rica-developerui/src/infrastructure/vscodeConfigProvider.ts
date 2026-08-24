import * as vscode from 'vscode';
import { ConfigProvider } from '../application/ports/configProvider';
import { AnalyzerConfig, AiConfig, DEFAULT_AI_CONFIG, DEFAULT_LAYER_BOUNDARIES } from '../domain/analyzerConfig';

export class VscodeConfigProvider implements ConfigProvider {
  getConfig(): AnalyzerConfig {
    const cfg = vscode.workspace.getConfiguration('javaAstAnalyzer');
    const layerBoundaries = cfg.get<Record<string, { packages: string[]; allowedDeps: string[] }>>('layerBoundaries');
    const ai: AiConfig = {
      enableAiAdvisory: cfg.get<boolean>('enableAiAdvisory', DEFAULT_AI_CONFIG.enableAiAdvisory),
      aiProvider: cfg.get<AiConfig['aiProvider']>('aiProvider', DEFAULT_AI_CONFIG.aiProvider),
      aiEndpoint: cfg.get<string>('aiEndpoint', DEFAULT_AI_CONFIG.aiEndpoint),
      aiModel: cfg.get<string>('aiModel', DEFAULT_AI_CONFIG.aiModel),
      aiMaxTokensPerRequest: cfg.get<number>('aiMaxTokensPerRequest', DEFAULT_AI_CONFIG.aiMaxTokensPerRequest),
      aiTimeoutMs: cfg.get<number>('aiTimeoutMs', DEFAULT_AI_CONFIG.aiTimeoutMs),
      aiMaxCandidatesPerRun: cfg.get<number>('aiMaxCandidatesPerRun', DEFAULT_AI_CONFIG.aiMaxCandidatesPerRun),
      aiTrigger: cfg.get<AiConfig['aiTrigger']>('aiTrigger', DEFAULT_AI_CONFIG.aiTrigger),
      aiAuditLogEnabled: cfg.get<boolean>('aiAuditLogEnabled', DEFAULT_AI_CONFIG.aiAuditLogEnabled),
    };
    return {
      enableArchitecturalChecks: cfg.get<boolean>('enableArchitecturalChecks', true),
      enableDesignPatternChecks: cfg.get<boolean>('enableDesignPatternChecks', true),
      enableBusinessLogicChecks: cfg.get<boolean>('enableBusinessLogicChecks', true),
      businessLogicThreshold: cfg.get<number>('businessLogicThreshold', 3),
      constructionStatementLimit: cfg.get<number>('constructionStatementLimit', 5),
      fatInterfaceMethodLimit: cfg.get<number>('fatInterfaceMethodLimit', 10),
      missingCommandComplexityThreshold: cfg.get<number>('missingCommandComplexityThreshold', 6),
      crossCuttingCallLimit: cfg.get<number>('crossCuttingCallLimit', 2),
      stateMachineClassLimit: cfg.get<number>('stateMachineClassLimit', 3),
      notifierTargetLimit: cfg.get<number>('notifierTargetLimit', 3),
      guardClauseLimit: cfg.get<number>('guardClauseLimit', 5),
      nullCheckLimit: cfg.get<number>('nullCheckLimit', 3),
      templateMethodSimilarity: cfg.get<number>('templateMethodSimilarity', 0.8),
      bridgeHierarchyThreshold: cfg.get<number>('bridgeHierarchyThreshold', 4),
      excludePatterns: cfg.get<string[]>('excludePatterns', []),
      layerBoundaries: layerBoundaries as Record<string, { packages: string[]; allowedDeps: string[] }> || DEFAULT_LAYER_BOUNDARIES,
      ai,
    };
  }

  onConfigChange(callback: () => void): void {
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('javaAstAnalyzer')) callback();
    });
  }
}
