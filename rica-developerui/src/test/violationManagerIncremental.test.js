const assert = require('assert');
const { JavaParser } = require('../javaParser');
const { ViolationManager } = require('../violationManager');
const { DEFAULT_AI_CONFIG, DEFAULT_LAYER_BOUNDARIES } = require('../domain/analyzerConfig');

const outputChannel = { appendLine: () => {} };
const parser = new JavaParser(outputChannel);

function makeManager() {
    const reporter = {
        report: () => {},
        clear: () => {},
        clearFile: () => {},
    };
    const config = {
        enableArchitecturalChecks: true,
        enableDesignPatternChecks: true,
        enableBusinessLogicChecks: true,
        businessLogicThreshold: 3,
        excludePatterns: [],
        layerBoundaries: DEFAULT_LAYER_BOUNDARIES,
        ai: DEFAULT_AI_CONFIG,
    };
    const configProvider = {
        getConfig: () => config,
        onConfigChange: () => {},
    };
    return new ViolationManager(reporter, parser, configProvider);
}

describe('ViolationManager - incremental revalidation', () => {
    it('should not run a full update for a method-body-only edit', () => {
        const filePath = 'src/main/java/com/example/service/OrderService.java';
        const before = `package com.example.service;

public class OrderService {
    public int total(int value) {
        return value + 1;
    }
}`;
        const after = `package com.example.service;

public class OrderService {
    public int total(int value) {
        int adjusted = value + 2;
        return adjusted;
    }
}`;

        const manager = makeManager();
        manager.seedFileCache(filePath, parser.parse(before, filePath));

        let fullUpdateCalls = 0;
        manager.update = () => { fullUpdateCalls++; };

        manager.onFileSaved(filePath, after);

        assert.strictEqual(fullUpdateCalls, 0);
    });

    it('should revalidate affected files without a full update when the public signature changes', () => {
        const filePath = 'src/main/java/com/example/service/OrderService.java';
        const before = `package com.example.service;

public class OrderService {
    public int total(int value) {
        return value + 1;
    }
}`;
        const after = `package com.example.service;

public class OrderService {
    public long total(long value) {
        return value + 1;
    }
}`;

        const manager = makeManager();
        manager.seedFileCache(filePath, parser.parse(before, filePath));

        let fullUpdateCalls = 0;
        manager.update = () => { fullUpdateCalls++; };

        manager.onFileSaved(filePath, after);

        assert.strictEqual(fullUpdateCalls, 0);
    });

    it('should run a full update for a newly discovered file', () => {
        const filePath = 'src/main/java/com/example/service/NewOrderService.java';
        const content = `package com.example.service;

public class NewOrderService {
    public int total(int value) {
        return value + 1;
    }
}`;

        const manager = makeManager();

        let fullUpdateCalls = 0;
        manager.update = () => { fullUpdateCalls++; };

        manager.onFileSaved(filePath, content);

        assert.strictEqual(fullUpdateCalls, 1);
    });

    it('should select only design-pattern rules affected by the changed AST facts', () => {
        const filePath = 'src/main/java/com/example/service/OrderService.java';
        const before = `package com.example.service;

public class OrderService {
    public void total() {
        System.out.println("ok");
    }
}`;
        const after = `package com.example.service;

public class OrderService {
    public void total() {
        new Thread(() -> System.out.println("ok")).start();
    }
}`;

        const manager = makeManager();
        manager.seedFileCache(filePath, parser.parse(before, filePath));

        const analyzedRuleGroups = [];
        manager.designPatternAnalyzer.analyzeRuleTypes = (ruleTypes) => {
            analyzedRuleGroups.push([...ruleTypes]);
            return [];
        };

        manager.onFileSaved(filePath, after);

        const analyzedRules = analyzedRuleGroups.flat();
        assert.ok(analyzedRules.includes('raw-thread'));
        assert.ok(!analyzedRules.includes('missing-adapter'));
    });
});
