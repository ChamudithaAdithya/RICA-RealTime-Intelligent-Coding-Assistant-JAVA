import { FullASTOutput } from '../../domain/astTypes';
import { Violation } from '../../domain/violations';

export interface AnalyzerService {
  analyze(asts: FullASTOutput[]): Violation[];
  analyzeSingle(ast: FullASTOutput): Violation[];
}
