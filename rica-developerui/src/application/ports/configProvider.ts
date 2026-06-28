import { AnalyzerConfig } from '../../domain/analyzerConfig';

export interface ConfigProvider {
  getConfig(): AnalyzerConfig;
  onConfigChange(callback: () => void): void;
}
