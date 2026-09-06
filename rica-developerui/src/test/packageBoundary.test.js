const assert = require('assert');
const { JavaParser } = require('../../dist/javaParser');
const { PackageBoundaryAnalyzer } = require('../../dist/analyzers/packageBoundaryDetector');

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
            confidence: 'Medium',
            evidence: 'import com.example.presentation.UserController',
            reason: 'application layer depends on presentation layer, but allowed dependencies are [domain].',
            type: 'Architecture-dependent boundary warning',
        });
    });

    it('should classify a Feign client as infrastructure despite a controller package', () => {
        const ast = parse(`package com.example.application;
import com.example.controller.feignClient.NotificationServiceClient;

public class NotificationService {
    private NotificationServiceClient client;
}`, 'src/main/java/com/example/application/NotificationService.java');
        const clientAst = parse(`package com.example.controller.feignClient;
import org.springframework.cloud.openfeign.FeignClient;
@FeignClient("notifications")
public interface NotificationServiceClient { }
`, 'src/main/java/com/example/controller/feignClient/NotificationServiceClient.java');
        const analyzer = new PackageBoundaryAnalyzer({
            layerBoundaries: {
                application: { packages: ['**/application/**'], allowedDeps: ['infrastructure'] },
                infrastructure: { packages: ['**/controller/**'], allowedDeps: ['application'] },
                presentation: { packages: ['**/presentation/**'], allowedDeps: ['application'] },
            },
        });
        const annotations = new Map([
            ['com.example.controller.feignClient.NotificationServiceClient', ['FeignClient']],
        ]);
        const raw = analyzer.analyze([ast, clientAst], undefined, annotations);
        assert.strictEqual(raw.length, 0, 'Feign client should not be treated as presentation');
    });

    it('should allow conventional Spring service-to-repository dependencies', () => {
        const serviceAst = parse(`package com.example.service;
import com.example.repository.EventConfigRepository;
import org.springframework.stereotype.Service;
@Service
public class EventConfigServiceImpl {
    private EventConfigRepository repository;
}`, 'src/main/java/com/example/service/EventConfigServiceImpl.java');
        const repositoryAst = parse(`package com.example.repository;
import org.springframework.stereotype.Repository;
@Repository
public interface EventConfigRepository { }
`, 'src/main/java/com/example/repository/EventConfigRepository.java');
        const analyzer = new PackageBoundaryAnalyzer({
            layerBoundaries: {
                application: { packages: ['**/service/**'], allowedDeps: ['domain'] },
                infrastructure: { packages: ['**/repository/**'], allowedDeps: ['domain', 'application'] },
                domain: { packages: ['**/domain/**'], allowedDeps: [] },
            },
        });
        const annotations = new Map([
            ['com.example.repository.EventConfigRepository', ['Repository']],
        ]);
        const raw = analyzer.analyze([serviceAst, repositoryAst], undefined, annotations);
        assert.strictEqual(raw.length, 0, 'conventional Spring persistence wiring should be allowed');
    });

    it('should not classify external packages that happen to contain ui as presentation', () => {
        const serviceAst = parse(`package com.example.service;
import org.jfree.chart.ui.RectangleInsets;
import org.springframework.stereotype.Service;
@Service
public class StatisticsPdfService {
    private RectangleInsets insets;
}`, 'src/main/java/com/example/service/StatisticsPdfService.java');
        const analyzer = new PackageBoundaryAnalyzer({
            layerBoundaries: {
                application: { packages: ['**/service/**'], allowedDeps: ['domain', 'infrastructure'] },
                infrastructure: { packages: ['**/repository/**', '**/config/**'], allowedDeps: ['domain', 'application'] },
                presentation: { packages: ['**/ui/**', '**/controller/**'], allowedDeps: ['domain', 'application'] },
                domain: { packages: ['**/domain/**'], allowedDeps: [] },
            },
        });
        const annotations = new Map([
            ['com.example.service.StatisticsPdfService', ['Service']],
        ]);
        const raw = analyzer.analyze([serviceAst], undefined, annotations);
        assert.strictEqual(raw.length, 0, 'external library imports should not be treated as internal layer imports');
    });
});
