const assert = require('assert');
const { JavaParser } = require('../javaParser');
const { DesignPatternAnalyzer } = require('../designPatternAnalyzer');

const outputChannel = { appendLine: () => {} };
const parser = new JavaParser(outputChannel);

function parse(code, filePath) {
    return parser.parse(code, filePath || 'Test.java');
}

function analyze(code, config) {
    const ast = parse(code);
    const analyzer = new DesignPatternAnalyzer(config);
    return analyzer.analyze([ast]);
}

function analyzeAll(sources, config) {
    const asts = sources.map(s => parse(s.code, s.path || s.file));
    const analyzer = new DesignPatternAnalyzer(config);
    return analyzer.analyze(asts);
}

describe('DesignPatternAnalyzer — V308 Leaking Construction Logic', () => {

    it('should flag heavy nested construction in a business method', () => {
        const code = `package com.example;
class OrderService {
    public Order buildOrder() {
        return new Order(new Address("Street", 10, new City("NY", 10001)), new Customer("John", "Doe", new Phone("+1", "555", "0100")));
    }
}`;
        const violations = analyze(code);
        const v308 = violations.find(v => v.code === 'RICA-V308');
        assert.ok(v308, 'should emit V308');
        assert.strictEqual(v308.severity, 'warning');
        assert.match(v308.message, /buildOrder/);
    });

    it('should NOT flag fluent builder cascades', () => {
        const code = `package com.example;
class OrderService {
    public Order build() {
        return Order.builder().withA().withB().withC().withD().withE().build();
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V308'), 'builder cascade should be skipped');
    });

    it('should NOT flag anonymous Thread/Runnable constructions', () => {
        const code = `package com.example;
class OrderService {
    public void start() {
        Thread t = new Thread(() -> {});
        t.start();
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V308'), 'Thread/Runnable should be skipped');
    });

    it('should honor the constructionStatementLimit config', () => {
        const code = `package com.example;
class OrderService {
    public Order buildOrder() {
        return new Order(new Address("Street", 10), new Customer("John", "Doe"));
    }
}`;
        const strict = analyze(code, { constructionStatementLimit: 2 });
        assert.ok(strict.some(v => v.code === 'RICA-V308'), 'low limit should flag');
        const lenient = analyze(code, { constructionStatementLimit: 50 });
        assert.ok(!lenient.some(v => v.code === 'RICA-V308'), 'high limit should not flag');
    });

    it('should flag branching (ternary) logic inside a construction even under the count limit', () => {
        const code = `package com.example;
class OrderService {
    public Order buildOrder(boolean fast) {
        return new Order(fast ? new Address("A", 10) : new Address("B", 20));
    }
}`;
        const violations = analyze(code, { constructionStatementLimit: 50 });
        const v308 = violations.find(v => v.code === 'RICA-V308');
        assert.ok(v308, 'branching construction should flag');
        assert.match(v308.message, /branching logic/);
    });
});

describe('DesignPatternAnalyzer — V309 Fat Interface (ISP)', () => {

    it('should flag a project interface with > limit methods', () => {
        const code = `package com.example;
interface AllInOne {
    void a(); void b(); void c(); void d(); void e();
    void f(); void g(); void h(); void i(); void j(); void k();
}`;
        const violations = analyze(code);
        const v309 = violations.find(v => v.code === 'RICA-V309');
        assert.ok(v309, 'should emit V309');
        assert.strictEqual(v309.severity, 'warning');
    });

    it('should NOT flag a small interface', () => {
        const code = `package com.example;
interface SmallIf {
    void a();
    void b();
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V309'), 'small interface should be fine');
    });

    it('should honor fatInterfaceMethodLimit config', () => {
        const code = `package com.example;
interface Iface {
    void a(); void b(); void c();
}`;
        const strict = analyze(code, { fatInterfaceMethodLimit: 2 });
        assert.ok(strict.some(v => v.code === 'RICA-V309'), 'low limit should flag');
        const lenient = analyze(code, { fatInterfaceMethodLimit: 10 });
        assert.ok(!lenient.some(v => v.code === 'RICA-V309'), 'high limit should not flag');
    });

    it('should flag an interface whose declared methods are mostly unused by clients (usage ratio)', () => {
        const iface = {
            path: 'OrderWriter.java',
            code: `package com.example;
interface OrderWriter {
    void writeOne(); void writeTwo(); void writeThree(); void writeFour(); void writeFive();
}`,
        };
        const client = {
            path: 'OrderClient.java',
            code: `package com.example;
class OrderClient {
    private OrderWriter writer;
    public void a() { writer.writeOne(); }
}`,
        };
        const violations = analyzeAll([iface, client]);
        const v309 = violations.find(v => v.code === 'RICA-V309');
        assert.ok(v309, 'low usage ratio should flag');
        assert.match(v309.message, /%\) are used/);
    });

    it('should NOT flag an interface whose methods are mostly used by clients', () => {
        const iface = {
            path: 'OrderWriter.java',
            code: `package com.example;
interface OrderWriter {
    void writeOne(); void writeTwo(); void writeThree(); void writeFour(); void writeFive();
}`,
        };
        const client = {
            path: 'OrderClient.java',
            code: `package com.example;
class OrderClient {
    private OrderWriter writer;
    public void a() { writer.writeOne(); }
    public void b() { writer.writeTwo(); }
    public void c() { writer.writeThree(); }
}`,
        };
        const violations = analyzeAll([iface, client]);
        assert.ok(!violations.some(v => v.code === 'RICA-V309'), 'ratio >= 50% should not flag');
    });

    it('should count method usage via implementation-typed receivers', () => {
        const iface = {
            path: 'Payable.java',
            code: `package com.example;
interface Payable {
    void pay(); void refund(); void hold(); void settle();
}`,
        };
        const impl = {
            path: 'Visa.java',
            code: `package com.example;
class Visa implements Payable {
    public void pay() {}
    public void refund() {}
    public void hold() {}
    public void settle() {}
}`,
        };
        const client = {
            path: 'Checkout.java',
            code: `package com.example;
class Checkout {
    private Visa visa;
    public void go() { visa.pay(); visa.refund(); }
}`,
        };
        const violations = analyzeAll([iface, impl, client]);
        assert.ok(!violations.some(v => v.code === 'RICA-V309'), 'usage via impl-typed receiver (2/4 = 50%) should not flag');
    });
});

describe('DesignPatternAnalyzer — V310 Missing Command Pattern', () => {

    it('should flag a complex method with multiple persistence writes', () => {
        const code = `package com.example;
class OrderService {
    private OrderRepository repository;
    public void process(Order o) {
        if (o == null) throw new IllegalArgumentException();
        if (o.total < 0) throw new IllegalArgumentException();
        if (o.flag) { if (o.second) { repository.saveAndFlush(o); } }
        repository.deleteById(o.id);
        if (o.active) repository.save(o);
    }
}`;
        const violations = analyze(code);
        const v310 = violations.find(v => v.code === 'RICA-V310');
        assert.ok(v310, 'should emit V310');
        assert.strictEqual(v310.severity, 'warning');
        assert.match(v310.message, /persistence writes/);
    });

    it('should NOT flag @Transactional methods', () => {
        const code = `package com.example;
class OrderService {
    private OrderRepository repository;
    @Transactional
    public void process(Order o) {
        repository.saveAndFlush(o);
        repository.deleteById(o.id);
        if (o.active) repository.save(o);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V310'), '@Transactional should exempt');
    });

    it('should NOT flag a single write / simple method', () => {
        const code = `package com.example;
class OrderService {
    private OrderRepository repository;
    public void save(Order o) {
        repository.save(o);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V310'), 'single write should be fine');
    });

    it('should honor missingCommandComplexityThreshold config', () => {
        const code = `package com.example;
class OrderService {
    private OrderRepository repository;
    public void process(Order o) {
        repository.saveAndFlush(o);
        repository.deleteById(o.id);
    }
}`;
        const strict = analyze(code, { missingCommandComplexityThreshold: 1 });
        assert.ok(strict.some(v => v.code === 'RICA-V310'), 'low threshold should flag');
        const lenient = analyze(code, { missingCommandComplexityThreshold: 50 });
        assert.ok(!lenient.some(v => v.code === 'RICA-V310'), 'high threshold should not flag');
    });
});

describe('DesignPatternAnalyzer — no-op gating', () => {

    it('should emit nothing for V308-V310 when design-pattern checks are disabled', () => {
        const code = `package com.example;
interface Big {
    void a(); void b(); void c(); void d(); void e();
    void f(); void g(); void h(); void i(); void j(); void k();
}
class OrderService {
    private OrderRepository repository;
    public void process(Order o) {
        repository.saveAndFlush(o);
        repository.deleteById(o.id);
        if (o.active) repository.save(o);
    }
}`;
        const ast = parse(code);
        const analyzer = new DesignPatternAnalyzer({ enableDesignPatternChecks: false });
        const violations = analyzer.analyze([ast]);
        assert.ok(!violations.some(v => v.code === 'RICA-V308'
            || v.code === 'RICA-V309'
            || v.code === 'RICA-V310'), 'disabled checks should suppress new rules');
    });
});