"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LAYER_BOUNDARIES = void 0;
exports.DEFAULT_LAYER_BOUNDARIES = {
    domain: { packages: ['**/domain/**', '**/entity/**', '**/dto/**', '**/enum/**'], allowedDeps: [] },
    application: { packages: ['**/application/**', '**/service/**', '**/useCase/**'], allowedDeps: ['domain', 'infrastructure'] },
    infrastructure: { packages: ['**/infrastructure/**', '**/dao/**', '**/repository/**', '**/adapter/**', '**/config/**', '**/feign/**', '**/feignClient/**'], allowedDeps: ['domain', 'application'] },
    presentation: { packages: ['**/controller/**', '**/view/**', '**/ui/**', '**/presentation/**'], allowedDeps: ['domain', 'application'] },
};
//# sourceMappingURL=analyzerConfig.js.map