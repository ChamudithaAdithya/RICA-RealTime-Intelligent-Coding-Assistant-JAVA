"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageBoundaryAnalyzer = void 0;
const analyzerConfig_1 = require("./domain/analyzerConfig");
const violationCatalog_1 = require("./violationCatalog");
class PackageBoundaryAnalyzer {
    constructor(config) {
        this.config = {
            enableArchitecturalChecks: true,
            enableDesignPatternChecks: true,
            enableBusinessLogicChecks: true,
            businessLogicThreshold: 3,
            excludePatterns: [],
            layerBoundaries: { ...analyzerConfig_1.DEFAULT_LAYER_BOUNDARIES },
            ai: { ...analyzerConfig_1.DEFAULT_AI_CONFIG },
            ...config,
        };
    }
    analyze(astOutputs, _graph, classAnnotations) {
        const violations = [];
        const boundaries = this.config.layerBoundaries;
        if (!boundaries)
            return violations;
        const layers = Object.keys(boundaries);
        for (const fileAst of astOutputs) {
            const filePath = fileAst.filePath || '';
            const fileLayer = this.matchLayer(filePath, boundaries);
            if (!fileLayer)
                continue;
            for (const imp of (fileAst.imports || [])) {
                const targetLayer = this.matchLayerByFqn(imp.qualifiedName, boundaries, layers);
                if (!targetLayer)
                    continue;
                // If the target is in a controller package but annotated @Component (not @Controller/@RestController),
                // treat it as a generic component, not a controller-layer class.
                if (targetLayer === 'presentation' && classAnnotations) {
                    const anns = classAnnotations.get(imp.qualifiedName);
                    if (anns && anns.includes('Component') && !anns.some(a => a === 'Controller' || a === 'RestController')) {
                        continue;
                    }
                }
                const allowed = boundaries[fileLayer].allowedDeps;
                if (targetLayer === fileLayer)
                    continue;
                if (!allowed.includes(targetLayer)) {
                    violations.push({
                        type: 'package-violation',
                        message: `Layer '${fileLayer}' should not depend on layer '${targetLayer}'. Allowed deps: [${allowed.join(', ')}]`,
                        className: filePath,
                        filePath: filePath,
                        lineNumber: imp.line,
                        severity: 'error',
                        sourceLayer: fileLayer,
                        targetLayer: targetLayer,
                        targetType: imp.qualifiedName,
                    });
                }
            }
        }
        return this.deduplicate(violations);
    }
    setConfig(config) {
        Object.assign(this.config, config);
    }
    matchLayer(filePath, boundaries) {
        const normalized = filePath.replace(/\\/g, '/');
        for (const [name, boundary] of Object.entries(boundaries)) {
            for (const pattern of boundary.packages) {
                if (this.globMatch(normalized, pattern)) {
                    return name;
                }
            }
        }
        return null;
    }
    matchLayerByFqn(fqn, boundaries, layers) {
        const pkgPath = fqn.replace(/\./g, '/');
        for (const layer of layers) {
            const boundary = boundaries[layer];
            for (const pattern of boundary.packages) {
                if (this.globMatch(pkgPath, pattern) || this.globMatch('/' + pkgPath, pattern)) {
                    return layer;
                }
            }
        }
        return null;
    }
    globMatch(path, pattern) {
        const regexStr = '^' + pattern
            .replace(/\*\*/g, '___DOUBLESTAR___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DOUBLESTAR___/g, '.*')
            .replace(/\?/g, '.')
            + '$';
        try {
            return new RegExp(regexStr).test(path);
        }
        catch {
            return path.includes(pattern.replace(/\*\*/g, '').replace(/\*/g, ''));
        }
    }
    deduplicate(violations) {
        const seen = new Set();
        return violations.filter(v => {
            const key = `${v.filePath}:${v.lineNumber || 0}:${v.sourceLayer}→${v.targetLayer}:${v.targetType}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    toUnifiedViolations(layerViolations) {
        return layerViolations.map(v => ({
            id: `rica-v501-${v.className}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ruleName: 'Package Boundary Violation',
            severity: v.severity,
            message: v.message,
            filePath: v.filePath,
            lineNumber: v.lineNumber,
            code: 'RICA-V501',
            range: v.range,
            mitigationHint: `Restructure the dependency: '${v.sourceLayer}' must not depend on '${v.targetLayer}'. Move the type '${v.targetType}' or invert the dependency.`,
            explanation: `Clean Architecture: inner layers must not depend on outer layers. ${v.sourceLayer} → ${v.targetLayer} violates the Dependency Rule.`,
            contextMetadata: {
                sourceLayer: v.sourceLayer,
                targetLayer: v.targetLayer,
                targetComponent: v.targetType,
            },
            legacyType: 'package-violation',
            detectorSource: 'PackageBoundaryAnalyzer',
            documentationUrl: (0, violationCatalog_1.violationDocSlug)('RICA-V501'),
        }));
    }
}
exports.PackageBoundaryAnalyzer = PackageBoundaryAnalyzer;
//# sourceMappingURL=packageBoundaryDetector.js.map