"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LAYER_BOUNDARIES = exports.DEFAULT_AI_CONFIG = void 0;
exports.DEFAULT_AI_CONFIG = {
    enableAiAdvisory: false,
    aiProvider: 'ollama',
    aiEndpoint: 'http://localhost:11434',
    aiModel: 'qwen2.5-coder:7b',
    aiMaxTokensPerRequest: 2000,
    aiTimeoutMs: 30000,
    aiMaxCandidatesPerRun: 8,
    aiTrigger: 'onDemand',
    aiAuditLogEnabled: true,
};
exports.DEFAULT_LAYER_BOUNDARIES = {
    domain: { packages: ['**/domain/**', '**/entity/**', '**/dto/**', '**/enum/**'], allowedDeps: [] },
    application: { packages: ['**/application/**', '**/service/**', '**/useCase/**'], allowedDeps: ['domain', 'infrastructure'] },
    infrastructure: { packages: ['**/infrastructure/**', '**/dao/**', '**/repository/**', '**/adapter/**', '**/config/**', '**/feign/**', '**/feignClient/**'], allowedDeps: ['domain', 'application'] },
    presentation: { packages: ['**/controller/**', '**/view/**', '**/ui/**', '**/presentation/**'], allowedDeps: ['domain', 'application'] },
};
//# sourceMappingURL=analyzerConfig.js.map