"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VscodeConfigProvider = void 0;
const vscode = __importStar(require("vscode"));
const analyzerConfig_1 = require("../domain/analyzerConfig");
class VscodeConfigProvider {
    getConfig() {
        const cfg = vscode.workspace.getConfiguration('javaAstAnalyzer');
        const layerBoundaries = cfg.get('layerBoundaries');
        const ai = {
            enableAiAdvisory: cfg.get('enableAiAdvisory', analyzerConfig_1.DEFAULT_AI_CONFIG.enableAiAdvisory),
            aiProvider: cfg.get('aiProvider', analyzerConfig_1.DEFAULT_AI_CONFIG.aiProvider),
            aiEndpoint: cfg.get('aiEndpoint', analyzerConfig_1.DEFAULT_AI_CONFIG.aiEndpoint),
            aiModel: cfg.get('aiModel', analyzerConfig_1.DEFAULT_AI_CONFIG.aiModel),
            aiMaxTokensPerRequest: cfg.get('aiMaxTokensPerRequest', analyzerConfig_1.DEFAULT_AI_CONFIG.aiMaxTokensPerRequest),
            aiTimeoutMs: cfg.get('aiTimeoutMs', analyzerConfig_1.DEFAULT_AI_CONFIG.aiTimeoutMs),
            aiMaxCandidatesPerRun: cfg.get('aiMaxCandidatesPerRun', analyzerConfig_1.DEFAULT_AI_CONFIG.aiMaxCandidatesPerRun),
            aiTrigger: cfg.get('aiTrigger', analyzerConfig_1.DEFAULT_AI_CONFIG.aiTrigger),
            aiAuditLogEnabled: cfg.get('aiAuditLogEnabled', analyzerConfig_1.DEFAULT_AI_CONFIG.aiAuditLogEnabled),
        };
        return {
            enableArchitecturalChecks: cfg.get('enableArchitecturalChecks', true),
            enableDesignPatternChecks: cfg.get('enableDesignPatternChecks', true),
            enableBusinessLogicChecks: cfg.get('enableBusinessLogicChecks', true),
            businessLogicThreshold: cfg.get('businessLogicThreshold', 3),
            constructionStatementLimit: cfg.get('constructionStatementLimit', 5),
            fatInterfaceMethodLimit: cfg.get('fatInterfaceMethodLimit', 10),
            missingCommandComplexityThreshold: cfg.get('missingCommandComplexityThreshold', 6),
            crossCuttingCallLimit: cfg.get('crossCuttingCallLimit', 2),
            stateMachineClassLimit: cfg.get('stateMachineClassLimit', 3),
            notifierTargetLimit: cfg.get('notifierTargetLimit', 3),
            guardClauseLimit: cfg.get('guardClauseLimit', 5),
            nullCheckLimit: cfg.get('nullCheckLimit', 3),
            templateMethodSimilarity: cfg.get('templateMethodSimilarity', 0.8),
            bridgeHierarchyThreshold: cfg.get('bridgeHierarchyThreshold', 4),
            excludePatterns: cfg.get('excludePatterns', []),
            layerBoundaries: layerBoundaries || analyzerConfig_1.DEFAULT_LAYER_BOUNDARIES,
            ai,
        };
    }
    onConfigChange(callback) {
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('javaAstAnalyzer'))
                callback();
        });
    }
}
exports.VscodeConfigProvider = VscodeConfigProvider;
//# sourceMappingURL=vscodeConfigProvider.js.map