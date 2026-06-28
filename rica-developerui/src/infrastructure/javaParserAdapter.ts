import { JavaParser } from './javaParser';
import { ParserService } from '../application/ports/parserService';
import { FullASTOutput } from '../domain/astTypes';

export class JavaParserAdapter implements ParserService {
  constructor(private readonly parser: JavaParser) {}

  parse(sourceCode: string, filePath: string): FullASTOutput {
    const result = this.parser.parse(sourceCode, filePath);
    if (result && result.error) {
      throw new Error(result.errorMessage || 'Parse failed');
    }
    return result as FullASTOutput;
  }
}
