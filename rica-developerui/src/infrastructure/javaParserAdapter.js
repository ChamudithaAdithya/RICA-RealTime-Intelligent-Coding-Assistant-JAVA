"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaParserAdapter = void 0;
class JavaParserAdapter {
    constructor(parser) {
        this.parser = parser;
    }
    parse(sourceCode, filePath) {
        const result = this.parser.parse(sourceCode, filePath);
        if (result && result.error) {
            throw new Error(result.errorMessage || 'Parse failed');
        }
        return result;
    }
}
exports.JavaParserAdapter = JavaParserAdapter;
//# sourceMappingURL=javaParserAdapter.js.map