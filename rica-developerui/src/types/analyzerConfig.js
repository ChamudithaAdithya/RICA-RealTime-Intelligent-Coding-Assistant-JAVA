"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAnalyzerConfig = loadAnalyzerConfig;
function loadAnalyzerConfig() {
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
//# sourceMappingURL=analyzerConfig.js.map