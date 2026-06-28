import * as vscode from 'vscode';
import { ConfigProvider } from '../application/ports/configProvider';
import { AnalyzerConfig, DEFAULT_LAYER_BOUNDARIES } from '../domain/analyzerConfig';

export class VscodeConfigProvider implements ConfigProvider {
  getConfig(): AnalyzerConfig {
    const cfg = vscode.workspace.getConfiguration('javaAstAnalyzer');
    const layerBoundaries = cfg.get<Record<string, { packages: string[]; allowedDeps: string[] }>>('layerBoundaries');
    return {
      enableArchitecturalChecks: cfg.get<boolean>('enableArchitecturalChecks', true),
      enableDesignPatternChecks: cfg.get<boolean>('enableDesignPatternChecks', true),
      enableBusinessLogicChecks: cfg.get<boolean>('enableBusinessLogicChecks', true),
      businessLogicThreshold: cfg.get<number>('businessLogicThreshold', 3),
      excludePatterns: cfg.get<string[]>('excludePatterns', []),
      layerBoundaries: layerBoundaries as Record<string, { packages: string[]; allowedDeps: string[] }> || DEFAULT_LAYER_BOUNDARIES,
    };
  }

  onConfigChange(callback: () => void): void {
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('javaAstAnalyzer')) callback();
    });
  }
}
