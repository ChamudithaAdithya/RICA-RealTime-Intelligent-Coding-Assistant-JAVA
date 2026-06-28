import { FullASTOutput } from '../../domain/astTypes';

export interface ParserService {
  parse(sourceCode: string, filePath: string): FullASTOutput;
}
