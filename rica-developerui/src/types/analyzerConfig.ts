export interface AnalyzerConfig {
  enableArchitecturalChecks: boolean;
  enableDesignPatternChecks: boolean;
  enableBusinessLogicChecks: boolean;
  businessLogicThreshold: number;
  excludePatterns: string[];
}

export function loadAnalyzerConfig(): AnalyzerConfig {
  const vscode = require('vscode');
  const config = vscode.workspace.getConfiguration('javaAstAnalyzer');
  return {
    enableArchitecturalChecks: config.get('enableArchitecturalChecks', true),
    enableDesignPatternChecks: config.get('enableDesignPatternChecks', true),
    enableBusinessLogicChecks: config.get('enableBusinessLogicChecks', true),
    businessLogicThreshold: config.get('businessLogicThreshold', 3),
    excludePatterns: config.get('excludePatterns', []),
  };
}
