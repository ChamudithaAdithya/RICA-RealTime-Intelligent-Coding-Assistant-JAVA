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

describe('DesignPatternAnalyzer - V307 Missing Abstraction', () => {

    it('should resolve simple implements names to project interfaces', () => {
        const iface = {
            path: 'src/main/java/com/example/domain/LonelyPort.java',
            code: `package com.example.domain;
public interface LonelyPort {
    void execute();
}`,
        };
        const impl = {
            path: 'src/main/java/com/example/domain/LonelyPortImpl.java',
            code: `package com.example.domain;
public class LonelyPortImpl implements LonelyPort {
    public void execute() {}
}`,
        };
        const violations = analyzeAll([iface, impl]);
        const v307 = violations.find(v => v.code === 'RICA-V307');
        assert.ok(v307, 'single unreferenced implementation should emit V307');
        assert.match(v307.message, /LonelyPort/);
    });

    it('should not flag a referenced single-implementation interface', () => {
        const iface = {
            path: 'src/main/java/com/example/domain/PaymentPort.java',
            code: `package com.example.domain;
public interface PaymentPort {
    void pay();
}`,
        };
        const impl = {
            path: 'src/main/java/com/example/domain/StripePaymentPort.java',
            code: `package com.example.domain;
public class StripePaymentPort implements PaymentPort {
    public void pay() {}
}`,
        };
        const client = {
            path: 'src/main/java/com/example/service/CheckoutService.java',
            code: `package com.example.service;
import com.example.domain.PaymentPort;
public class CheckoutService {
    private PaymentPort paymentPort;
    public void checkout() {
        paymentPort.pay();
    }
}`,
        };
        const violations = analyzeAll([iface, impl, client]);
        assert.ok(!violations.some(v => v.code === 'RICA-V307'), 'referenced seam should be allowed');
    });
});

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
        assert.strictEqual(v308.analysisMetadata.confidence, 'Medium');
        assert.strictEqual(v308.analysisMetadata.type, 'Design-pattern best-practice violation');
        assert.match(v308.analysisMetadata.evidence, /rule signal leaking-construction/);
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

describe('DesignPatternAnalyzer — V311 Missing Prototype', () => {

    it('should flag a manual copy with 3+ correlated pairs', () => {
        const code = `package com.example;
class OrderService {
    public void copy(Order from) {
        Order to = new Order();
        to.setId(from.getId());
        to.setName(from.getName());
        to.setQty(from.getQty());
    }
}`;
        const violations = analyze(code);
        const v311 = violations.find(v => v.code === 'RICA-V311');
        assert.ok(v311, 'should emit V311');
        assert.strictEqual(v311.severity, 'warning');
        assert.match(v311.message, /copy/);
    });

    it('should NOT flag a single copy pair', () => {
        const code = `package com.example;
class OrderService {
    public void copy(Order from) {
        Order to = new Order();
        to.setName(from.getName());
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V311'), 'single pair should be fine');
    });

    it('should NOT flag copies via a clone() method', () => {
        const code = `package com.example;
class OrderService {
    public Order copy(Order from) {
        return from.clone();
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V311'), 'clone() should be fine');
    });
});

describe('DesignPatternAnalyzer — V312 Fragmented Factories', () => {

    it('should flag two factory classes each exposing a no-arg create() returning the same type', () => {
        const sources = [
            { code: `package com.example;
class SqlOrderFactory { public Order create() { return new Order(); } }` },
            { code: `package com.example;
class MongoOrderFactory { public Order create() { return new Order(); } }` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(violations.some(v => v.code === 'RICA-V312'), 'should emit V312');
    });

    it('should NOT flag a single factory', () => {
        const code = `package com.example;
class OrderFactory { public Order create() { return new Order(); } }`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V312'), 'single factory is fine');
    });
});

describe('DesignPatternAnalyzer — V313 Missing Decorator', () => {

    it('should flag logger calls interleaved with a domain operation', () => {
        const code = `package com.example;
class OrderService {
    private org.slf4j.Logger logger;
    private OrderRepository repo;
    public void save(Order o) {
        logger.info("start");
        repo.save(o);
        logger.info("end");
    }
}`;
        const violations = analyze(code);
        const v313 = violations.find(v => v.code === 'RICA-V313');
        assert.ok(v313, 'should emit V313');
        assert.match(v313.message, /cross|decorator|Logger/i);
    });

    it('should NOT flag a method with only a logger call', () => {
        const code = `package com.example;
class OrderService {
    private org.slf4j.Logger logger;
    public void logIt() { logger.info("hello"); }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V313'), 'logging-only method is fine');
    });
});

describe('DesignPatternAnalyzer — V314 Missing Composite', () => {

    it('should flag loop + nested instanceof on a common variable', () => {
        const code = `package com.example;
class TreeWalker {
    public void walk(Object node) {
        for (Object child : nodes) {
            if (node instanceof Folder) {
                if (child instanceof FileItem) {
                    publish(child);
                }
            }
        }
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V314'), 'should emit V314');
    });

    it('should NOT flag a plain instanceof outside a loop', () => {
        const code = `package com.example;
class Printer {
    public void print(Object o) { if (o instanceof FileItem) { System.out.println(o); } }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V314'), 'single instanceof is fine');
    });
});

describe('DesignPatternAnalyzer — V315 Flyweight Missing', () => {

    it('should flag a Money value object constructed inside a loop', () => {
        const code = `package com.example;
class ReportService {
    public void render(List<Row> rows) {
        for (Row r : rows) {
            Money m = new Money(r.amount, "USD");
            print(m);
        }
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V315'), 'should emit V315');
    });

    it('should NOT flag a Money constructed outside a loop', () => {
        const code = `package com.example;
class ReportService {
    public Money render(Row r) {
        Money m = new Money(r.amount, "USD");
        return m;
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V315'), 'non-loop construction is fine');
    });
});

describe('DesignPatternAnalyzer — V316 Scattered State Machine', () => {

    it('should flag 3+ classes branching on the same status enum', () => {
        const sources = [
            { code: `package com.example;
class One { public void x(Order o) { if (o.getStatus() == PENDING) { approve(o); } } }` },
            { code: `package com.example;
class Two { public void y(Order o) { if (o.getStatus() == PENDING) { email(o); } } }` },
            { code: `package com.example;
class Three { public void z(Order o) { if (o.getStatus() == PENDING) { ship(o); } } }` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(violations.some(v => v.code === 'RICA-V316'), 'should emit V316');
    });

    it('should NOT flag scattered branches on the same status', () => {
        const sources = [
            { code: `package com.example;
class One { public void x(Order o) { if (o.getStatus() == PENDING) { approve(o); } } }` },
            { code: `package com.example;
class Two { public void y(Order o) { if (o.getStatus() == PENDING) { email(o); } } }` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(!violations.some(v => v.code === 'RICA-V316'), '2 classes is below the threshold');
    });
});

describe('DesignPatternAnalyzer — V317 Duplicate Algorithm', () => {

    it('should flag two writers with the same call sequence on different receiver types', () => {
        const sources = [
            { code: `package com.example;
class XmlReport {
    public void generate(Data d) {
        XmlWriter w = new XmlWriter();
        w.open(); w.header(d); w.body(d); w.footer(d); w.close();
    }
}` },
            { code: `package com.example;
class CsvReport {
    public void generate(Data d) {
        CsvWriter c = new CsvWriter();
        c.open(); c.header(d); c.body(d); c.footer(d); c.close();
    }
}` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(violations.some(v => v.code === 'RICA-V317'), 'should emit V317');
    });

    it('should NOT flag identical sequences on the same receiver type', () => {
        const sources = [
            { code: `package com.example;
class A {
    public void openAndClose(XmlWriter w) { w.open(); w.close(); }
}` },
            { code: `package com.example;
class B {
    public void openAndClose(XmlWriter w) { w.open(); w.close(); }
}` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(!violations.some(v => v.code === 'RICA-V317'), 'same receiver type is fine');
    });

    it('should NOT flag duplicate accessor/mapping sequences as template-method candidates', () => {
        const sources = [
            { code: `package com.example;
class CustomerView {
    public void fill(Customer c, CustomerDto d) {
        d.setId(c.getId()); d.setName(c.getName()); d.setEmail(c.getEmail());
        d.setPhone(c.getPhone()); d.setStatus(c.getStatus());
    }
}` },
            { code: `package com.example;
class AccountView {
    public void fill(Account a, AccountDto d) {
        d.setId(a.getId()); d.setName(a.getName()); d.setEmail(a.getEmail());
        d.setPhone(a.getPhone()); d.setStatus(a.getStatus());
    }
}` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(!violations.some(v => v.code === 'RICA-V317'), 'accessor-only copy sequences are mapping noise');
    });
});

describe('DesignPatternAnalyzer — V318 Hardcoded Notifications', () => {

    it('should flag 3+ direct notifier targets in one method', () => {
        const code = `package com.example;
class OrderService {
    private EmailService emailService;
    private SmsService smsService;
    private AuditLogService auditLogService;
    public void confirm(Order o) {
        emailService.send(o);
        smsService.send(o);
        auditLogService.record(o);
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V318'), 'should emit V318');
    });

    it('should NOT flag a single notifier call', () => {
        const code = `package com.example;
class OrderService {
    private EmailService emailService;
    public void confirm(Order o) { emailService.send(o); }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V318'), 'single notifier is fine');
    });
});

describe('DesignPatternAnalyzer — V319 Monolithic Validation Pipeline', () => {

    it('should flag a method with 5+ guard clauses', () => {
        const code = `package com.example;
class Validator {
    public void validate(Order o) {
        if (o == null) throw new IllegalArgumentException();
        if (o.id == null) throw new IllegalArgumentException();
        if (o.name == null) throw new IllegalArgumentException();
        if (o.qty < 0) throw new IllegalArgumentException();
        if (o.price < 0) throw new IllegalArgumentException();
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V319'), 'should emit V319');
    });

    it('should NOT flag fewer than 5 guard clauses', () => {
        const code = `package com.example;
class Validator {
    public void validate(Order o) {
        if (o == null) throw new IllegalArgumentException();
        if (o.qty < 0) throw new IllegalArgumentException();
        apply(o);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V319'), '2 guards are fine');
    });
});

describe('DesignPatternAnalyzer — V320 Service Locator', () => {

    it('should flag getBean() outside @Configuration', () => {
        const code = `package com.example;
class OrderService {
    private ApplicationContext ctx;
    public void run() {
        OrderRepository r = ctx.getBean(OrderRepository.class);
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V320'), 'should emit V320');
    });

    it('should NOT flag getBean() inside @Configuration', () => {
        const code = `package com.example;
@Configuration
class AppConfig {
    private ApplicationContext ctx;
    public void expose() {
        OrderRepository r = ctx.getBean(OrderRepository.class);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V320'), '@Configuration should exempt');
    });
});

describe('DesignPatternAnalyzer — V321 Excessive Null Checking', () => {

    it('should flag a method with 3+ null-testing decision points on distinct targets', () => {
        const code = `package com.example;
class OrderService {
    public String render(Order o, User u, Address a) {
        if (o == null) return "";
        if (u == null) return "";
        if (a == null) return "";
        return "";
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V321'), 'should emit V321');
    });

    it('should NOT flag a single-target guard ladder chain', () => {
        const code = `package com.example;
class OrderService {
    public String render(Order o) {
        if (o == null) return "";
        if (o.user == null) return "";
        if (o.user.name == null) return "";
        return o.user.name;
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V321'), 'should not emit V321 for single target');
    });

    it('should NOT flag fewer than 3 null checks', () => {
        const code = `package com.example;
class OrderService {
    public String render(Order o) {
        if (o == null) return "";
        return o.name;
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V321'), '2 null checks are fine');
    });
});

describe('DesignPatternAnalyzer — V322 Missing Proxy', () => {

    it('should flag direct heavy resource instantiation in service layer', () => {
        const code = `package com.example.service;
import javax.sql.DataSource;
class OrderService {
    public void process() {
        DataSource ds = new DataSource();
        ds.getConnection();
    }
}`;
        const ast = parse(code, 'service/OrderService.java');
        const analyzer = new DesignPatternAnalyzer();
        const violations = analyzer.analyze([ast]);
        assert.ok(violations.some(v => v.code === 'RICA-V322'), 'should emit V322 for direct DataSource new in service');
    });

    it('should flag EntityManager direct instantiation in controller layer', () => {
        const code = `package com.example.controller;
class OrderController {
    public void handle() {
        javax.persistence.EntityManager em = new javax.persistence.EntityManager();
    }
}`;
        const ast = parse(code, 'controller/OrderController.java');
        const violations = new DesignPatternAnalyzer().analyze([ast]);
        assert.ok(violations.some(v => v.code === 'RICA-V322'), 'should emit V322 for EntityManager in controller');
    });

    it('should NOT flag heavy resource in infrastructure layer', () => {
        const code = `package com.example.infrastructure;
import javax.sql.DataSource;
class DataSourceConfig {
    public void create() {
        DataSource ds = new DataSource();
    }
}`;
        const ast = parse(code, 'infrastructure/DataSourceConfig.java');
        const violations = new DesignPatternAnalyzer().analyze([ast]);
        assert.ok(!violations.some(v => v.code === 'RICA-V322'), 'infra layer should be exempt');
    });

    it('should NOT flag when proxy wrapper exists in infrastructure', () => {
        const infra = {
            path: 'infrastructure/ConnectionProxy.java',
            code: `package com.example.infrastructure;
class ConnectionProxy implements DataSource {
    public java.sql.Connection getConnection() { return null; }
}`
        };
        const service = {
            path: 'service/OrderService.java',
            code: `package com.example.service;
class OrderService {
    public void process() {
        DataSource ds = new DataSource();
    }
}`
        };
        // infrastructure provides interface impl → proxiedTypes includes DataSource → should NOT flag
        const asts = [parse(infra.code, infra.path), parse(service.code, service.path)];
        const violations = new DesignPatternAnalyzer().analyze(asts);
        assert.ok(!violations.some(v => v.code === 'RICA-V322'), 'should not flag when infra proxy exists');
    });

    it('should NOT flag normal business object creation', () => {
        const code = `package com.example.service;
class OrderService {
    public void process() {
        Order o = new Order();
    }
}`;
        const ast = parse(code, 'service/OrderService.java');
        const violations = new DesignPatternAnalyzer().analyze([ast]);
        assert.ok(!violations.some(v => v.code === 'RICA-V322'), 'normal Order creation should not flag');
    });
});

describe('DesignPatternAnalyzer — V323 Missing Bridge', () => {

    it('should flag combinatorial hierarchy explosion (RedSquare/BlueSquare...)', () => {
        const sources = [
            { path: 'Shape.java', code: `package com.example; abstract class Shape { abstract void draw(); }` },
            { path: 'RedSquare.java', code: `package com.example; class RedSquare extends Shape { void draw() {} }` },
            { path: 'BlueSquare.java', code: `package com.example; class BlueSquare extends Shape { void draw() {} }` },
            { path: 'RedCircle.java', code: `package com.example; class RedCircle extends Shape { void draw() {} }` },
            { path: 'BlueCircle.java', code: `package com.example; class BlueCircle extends Shape { void draw() {} }` },
        ];
        const asts = sources.map(s => parse(s.code, s.path));
        const violations = new DesignPatternAnalyzer().analyze(asts);
        assert.ok(violations.some(v => v.code === 'RICA-V323'), 'should emit V323 for 2x2 combinatorial explosion');
    });

    it('should flag DatabaseLogger/FileLogger/DatabaseNotifier/FileNotifier', () => {
        const sources = [
            { path: 'Notifier.java', code: `package com.example; abstract class Notifier { abstract void send(); }` },
            { path: 'DatabaseLogger.java', code: `package com.example; class DatabaseLogger extends Notifier { void send() {} }` },
            { path: 'FileLogger.java', code: `package com.example; class FileLogger extends Notifier { void send() {} }` },
            { path: 'DatabaseNotifier.java', code: `package com.example; class DatabaseNotifier extends Notifier { void send() {} }` },
            { path: 'FileNotifier.java', code: `package com.example; class FileNotifier extends Notifier { void send() {} }` },
        ];
        const asts = sources.map(s => parse(s.code, s.path));
        const violations = new DesignPatternAnalyzer().analyze(asts);
        assert.ok(violations.some(v => v.code === 'RICA-V323'), 'should emit V323 for Logger/Notifier combinatorial');
    });

    it('should NOT flag hierarchy below threshold', () => {
        const sources = [
            { path: 'Shape.java', code: `package com.example; abstract class Shape { abstract void draw(); }` },
            { path: 'RedSquare.java', code: `package com.example; class RedSquare extends Shape { void draw() {} }` },
            { path: 'BlueSquare.java', code: `package com.example; class BlueSquare extends Shape { void draw() {} }` },
            { path: 'RedCircle.java', code: `package com.example; class RedCircle extends Shape { void draw() {} }` },
        ];
        const asts = sources.map(s => parse(s.code, s.path));
        const violations = new DesignPatternAnalyzer({ bridgeHierarchyThreshold: 4 }).analyze(asts);
        assert.ok(!violations.some(v => v.code === 'RICA-V323'), '3 children below threshold should not flag');
    });

    it('should NOT flag non-combinatorial hierarchy', () => {
        const sources = [
            { path: 'Animal.java', code: `package com.example; abstract class Animal { abstract void speak(); }` },
            { path: 'Dog.java', code: `package com.example; class Dog extends Animal { void speak() {} }` },
            { path: 'Cat.java', code: `package com.example; class Cat extends Animal { void speak() {} }` },
            { path: 'Bird.java', code: `package com.example; class Bird extends Animal { void speak() {} }` },
            { path: 'Fish.java', code: `package com.example; class Fish extends Animal { void speak() {} }` },
        ];
        const asts = sources.map(s => parse(s.code, s.path));
        const violations = new DesignPatternAnalyzer().analyze(asts);
        assert.ok(!violations.some(v => v.code === 'RICA-V323'), 'distinct names without combinatorial repetition should not flag');
    });

    it('should honor bridgeHierarchyThreshold config', () => {
        const sources = [
            { path: 'Shape.java', code: `package com.example; abstract class Shape { abstract void draw(); }` },
            { path: 'RedSquare.java', code: `package com.example; class RedSquare extends Shape { void draw() {} }` },
            { path: 'BlueSquare.java', code: `package com.example; class BlueSquare extends Shape { void draw() {} }` },
            { path: 'RedCircle.java', code: `package com.example; class RedCircle extends Shape { void draw() {} }` },
            { path: 'BlueCircle.java', code: `package com.example; class BlueCircle extends Shape { void draw() {} }` },
            { path: 'GreenSquare.java', code: `package com.example; class GreenSquare extends Shape { void draw() {} }` },
            { path: 'GreenCircle.java', code: `package com.example; class GreenCircle extends Shape { void draw() {} }` },
        ];
        const asts = sources.map(s => parse(s.code, s.path));
        const strict = new DesignPatternAnalyzer({ bridgeHierarchyThreshold: 2 }).analyze(asts);
        assert.ok(strict.some(v => v.code === 'RICA-V323'), 'low threshold should flag');
        const lenient = new DesignPatternAnalyzer({ bridgeHierarchyThreshold: 10 }).analyze(asts);
        assert.ok(!lenient.some(v => v.code === 'RICA-V323'), 'high threshold should not flag');
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
