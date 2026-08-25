const assert = require('assert');
const { JavaParser } = require('../javaParser');
const { PackageBoundaryAnalyzer } = require('../packageBoundaryDetector');

const outputChannel = { appendLine: () => {} };
const parser = new JavaParser(outputChannel);

function parse(code, filePath) {
    return parser.parse(code, filePath);
}

describe('PackageBoundaryAnalyzer - analysis metadata', () => {
    it('should explain V501 confidence, evidence, reason, and best-practice type', () => {
        const ast = parse(`package com.example.application;
import com.example.presentation.UserController;

public class OrderService {
    private UserController controller;
}`, 'src/main/java/com/example/application/OrderService.java');

        const analyzer = new PackageBoundaryAnalyzer({
            layerBoundaries: {
                domain: { packages: ['**/domain/**'], allowedDeps: [] },
                application: { packages: ['**/application/**'], allowedDeps: ['domain'] },
                infrastructure: { packages: ['**/infrastructure/**'], allowedDeps: ['domain', 'application'] },
                presentation: { packages: ['**/presentation/**'], allowedDeps: ['domain', 'application'] },
            },
        });

        const raw = analyzer.analyze([ast]);
        assert.strictEqual(raw.length, 1);
        assert.strictEqual(raw[0].evidence, 'import com.example.presentation.UserController');

        const unified = analyzer.toUnifiedViolations(raw);
        assert.strictEqual(unified.length, 1);
        assert.strictEqual(unified[0].code, 'RICA-V501');
        assert.deepStrictEqual(unified[0].analysisMetadata, {
            confidence: 'High',
            evidence: 'import com.example.presentation.UserController',
            reason: 'application layer depends on presentation layer, but allowed dependencies are [domain].',
            type: 'Architecture best-practice violation',
        });
    });
});
