const assert = require('assert');
const { JavaParser } = require('../../dist/javaParser');
const { DesignPatternAnalyzer } = require('../../dist/analyzers/designPatternAnalyzer');

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

describe('DesignPatternAnalyzer - V303 Missing Strategy', () => {

    it('should flag repeated behavior selection on the same discriminator', () => {
        const code = `package com.example.service;
class PaymentService {
    public void pay(String type) {
        if (type == "CARD") {
            payCard();
        }
        if (type == "PAYPAL") {
            payPaypal();
        }
        if (type == "BANK") {
            payBank();
        }
        if (type == "CASH") {
            payCash();
        }
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V303'), 'strategy-style discriminator branches should emit V303');
    });

    it('should NOT flag null/empty guard mapping in JavaMailSender utility methods', () => {
        const code = `package com.simlea.service.util;
import org.apache.commons.lang3.StringUtils;
class JavaMailSenderUtils {
    public JavaMailSender createMailSenderFromClientDto(ClientDto clientDto, EventEmailTemplate eventEmailTemplate) {
        String host = clientDto.getSmtpHost();
        int port = (clientDto.getSmtpPort() != null && clientDto.getSmtpPort() > 0) ? clientDto.getSmtpPort() : 587;
        String username = clientDto.getSmtpUsername();
        String password = clientDto.getSmtpPassword();
        String encryption = clientDto.getSmtpEncryption();
        if (eventEmailTemplate != null ) {
            if (StringUtils.isNotEmpty(clientDto.getReplyToEmail())) {
                eventEmailTemplate.setReplyTo(clientDto.getReplyToEmail());
            }
            if (StringUtils.isNotEmpty(clientDto.getCompanyEmail())) {
                eventEmailTemplate.setMailFrom(clientDto.getCompanyEmail());
            }
            if (StringUtils.isNotEmpty(clientDto.getSenderName())) {
                eventEmailTemplate.setMailFromName(clientDto.getSenderName());
            }
        }
        return createMailSender(host, port, username, password, encryption);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V303'), 'guard-based DTO/template mapping should not emit V303');
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
        assert.strictEqual(v308.analysisMetadata.type, 'Design-pattern advisory / best-practice opportunity');
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

    it('should NOT flag cohesive PDF infrastructure setup with scalar constructor arguments', () => {
        const code = `package com.example;
class LeadPdfService {
    public byte[] generateLeadPdf() {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 20, 20, 20, 20);
        PdfWriter.getInstance(document, outputStream);
        return outputStream.toByteArray();
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V308'),
            'scalar PDF configuration arguments are not Factory/Builder evidence');
    });

    it('should NOT score ordinary scalar constructor arguments as construction complexity', () => {
        const code = `package com.example;
class ReportService {
    public Report createReport(String title, String author, int pages, boolean draft, long timestamp, String format) {
        return new Report(title, author, pages, draft, timestamp, format);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V308'),
            'constructor arity alone is not Factory/Builder evidence');
    });

    it('should NOT treat independent object allocations as one complex construction', () => {
        const code = `package com.example;
class OrderService {
    public void prepare() {
        Customer customer = new Customer();
        Address address = new Address();
        Order order = new Order();
        Invoice invoice = new Invoice();
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V308'),
            'independent allocations should not inflate each construction score');
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

    it('should NOT flag Spring Data repository interfaces as fat interfaces', () => {
        const code = `package com.example.repository;
import org.springframework.stereotype.Repository;
@Repository
interface UserRepository extends JpaRepository<User, Long> {
    User findByEmail(String email);
    User findByPhone(String phone);
    User findByStatus(String status);
    User findByTenantId(Long tenantId);
    User findByExternalId(String externalId);
    User findByUsername(String username);
    User findByCreatedBy(Long createdBy);
    User findByUpdatedBy(Long updatedBy);
    User findByRole(String role);
    User findByLanguage(String language);
    User findByDepartment(String department);
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V309'),
            'Spring Data query interfaces should not be treated as ISP violations');
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
        validate(o);
        logger.debug("validated");
        repo.reserve(o);
        logger.trace("reserved");
        repo.save(o);
        repo.flush();
        audit(o);
        logger.warn("audited");
        repo.index(o);
        publish(o);
        logger.info("end");
        repo.markComplete(o);
        logger.debug("complete");
    }
    private void validate(Order o) {
        repo.validate(o);
    }
    private void audit(Order o) {
        repo.audit(o);
    }
    private void publish(Order o) {
        repo.publish(o);
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

    it('should flag a long workflow with 7+ guard clauses', () => {
        const code = `package com.example;
class OrderWorkflow {
    public void process(Order o, User u, Payment p, Inventory inv) {
        if (o == null) throw new IllegalArgumentException();
        loadOrder(o);
        if (u == null) throw new IllegalArgumentException();
        loadUser(u);
        if (p == null) throw new IllegalArgumentException();
        loadPayment(p);
        if (inv == null) throw new IllegalArgumentException();
        reserve(inv);
        if (o.cancelled) throw new IllegalStateException();
        audit(o);
        if (u.blocked) throw new IllegalStateException();
        notifyUser(u);
        if (p.failed) throw new IllegalStateException();
        settle(p);
        if (inv.empty) throw new IllegalStateException();
        ship(o);
        reconcile(o);
        calculateTotals(o);
        writeAuditTrail(o);
        sendReceipt(u);
        scheduleFollowUp(o);
        complete(o);
        publish(o);
        index(o);
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

    it('should flag a method with many repetitive simple null exits', () => {
        const code = `package com.example;
class OrderService {
    public String render(Order o, User u, Address a, Form f, Event e, File file) {
        if (o == null) return "";
        if (u == null) return "";
        if (a == null) return "";
        if (f == null) return "";
        if (e == null) return "";
        if (file == null) return "";
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

    it('should not flag optional relationship lookups with existence validation', () => {
        const code = `package com.example;
class EventService {
    public void create(CreateDto dto) {
        Event event = null;
        Form form = null;
        if (dto.getEventId() != null) {
            event = findEvent(dto.getEventId());
            if (event == null) throw new IllegalArgumentException();
        }
        if (dto.getFormId() != null) {
            form = findForm(dto.getFormId());
            if (form == null) throw new IllegalArgumentException();
        }
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V321'),
            'optional inputs and lookup validation are meaningful business logic');
    });

    it('should retain domain getter guards as defensive checks', () => {
        const code = `package com.example;
class UserService {
    public void validate(User user, Profile profile, Account account) {
        if (user.getId() != null) return;
        if (profile.getName() != null) return;
        if (account.getOwner() != null) return;
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V321'),
            'getter syntax alone should not make a domain-object guard optionality');
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

    it('should NOT flag generic Spring base service implementations as Bridge opportunities', () => {
        const sources = [
            {
                path: 'src/main/java/com/simlea/service/impl/BaseServiceImpl.java',
                code: `package com.simlea.service.impl;
import org.springframework.data.jpa.repository.JpaRepository;
public abstract class BaseServiceImpl<T, Dto, ID, Res> {
    protected final JpaRepository<T, ID> repository;
    protected BaseServiceImpl(JpaRepository<T, ID> repository) {
        this.repository = repository;
    }
    public java.util.List<T> findAll() { return repository.findAll(); }
    public T save(T entity) { return repository.save(entity); }
    public void deleteById(ID id) { repository.deleteById(id); }
}`,
            },
            { path: 'src/main/java/com/simlea/service/impl/FileServiceImpl.java', code: `package com.simlea.service.impl; class FileServiceImpl extends BaseServiceImpl<File, FileDto, Long, FileRes> { void send() {} }` },
            { path: 'src/main/java/com/simlea/service/impl/EventServiceImpl.java', code: `package com.simlea.service.impl; class EventServiceImpl extends BaseServiceImpl<Event, EventDto, Long, EventRes> { void send() {} }` },
            { path: 'src/main/java/com/simlea/service/impl/StatisticsServiceImpl.java', code: `package com.simlea.service.impl; class StatisticsServiceImpl extends BaseServiceImpl<Statistics, StatisticsDto, Long, StatisticsRes> { void send() {} }` },
            { path: 'src/main/java/com/simlea/service/impl/ApiServiceImpl.java', code: `package com.simlea.service.impl; class ApiServiceImpl extends BaseServiceImpl<Api, ApiDto, Long, ApiRes> { void send() {} }` },
            { path: 'src/main/java/com/simlea/service/impl/MobileServiceImpl.java', code: `package com.simlea.service.impl; class MobileServiceImpl extends BaseServiceImpl<Mobile, MobileDto, Long, MobileRes> { void send() {} }` },
        ];
        const violations = analyzeAll(sources);
        assert.ok(!violations.some(v => v.code === 'RICA-V323'), 'generic repository-backed base service is a framework template, not Bridge evidence');
    });
});

describe('DesignPatternAnalyzer - V324 Missing Mediator', () => {

    it('should flag a workflow method coordinating many peer components', () => {
        const code = `package com.example.service;
class CheckoutService {
    private InventoryService inventoryService;
    private PaymentClient paymentClient;
    private FraudValidator fraudValidator;
    private ShippingManager shippingManager;
    private EmailNotifier emailNotifier;
    private AuditPublisher auditPublisher;

    public void checkout(Order order) {
        if (order == null) return;
        inventoryService.reserve(order);
        fraudValidator.validate(order);
        paymentClient.authorize(order);
        if (order.express) {
            shippingManager.scheduleExpress(order);
        } else {
            shippingManager.schedule(order);
        }
        emailNotifier.send(order);
        auditPublisher.publish(order);
        inventoryService.confirm(order);
        paymentClient.capture(order);
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V324'), 'should emit V324 for large peer coordination');
    });

    it('should not flag simple service delegation', () => {
        const code = `package com.example.service;
class OrderService {
    private OrderRepository orderRepository;
    private AuditPublisher auditPublisher;
    public void save(Order order) {
        orderRepository.save(order);
        auditPublisher.publish(order);
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V324'), 'small delegation should not emit V324');
    });

    it('should not flag Spring configuration classes', () => {
        const code = `package com.example.config;
import org.springframework.context.annotation.Configuration;
@Configuration
class AppConfiguration {
    public void configure() {
        alpha.setup(); beta.setup(); gamma.setup(); delta.setup();
        alpha.start(); beta.start(); gamma.start(); delta.start();
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V324'), 'configuration wiring should be exempt');
    });
});

describe('DesignPatternAnalyzer - V325 Missing Visitor', () => {

    it('should flag repeated type-dispatch over the same object family', () => {
        const code = `package com.example.domain;
class ReportExporter {
    public String render(Node node) {
        if (node instanceof TextNode) return "text";
        if (node instanceof ImageNode) return "image";
        if (node instanceof TableNode) return "table";
        return "";
    }
    public int calculate(Node node) {
        if (node instanceof TextNode) return 1;
        if (node instanceof ImageNode) return 2;
        if (node instanceof TableNode) return 3;
        return 0;
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V325'), 'should emit V325 for repeated type dispatch');
    });

    it('should not flag one isolated type-dispatch method', () => {
        const code = `package com.example.domain;
class ReportExporter {
    public String render(Node node) {
        if (node instanceof TextNode) return "text";
        if (node instanceof ImageNode) return "image";
        if (node instanceof TableNode) return "table";
        return "";
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V325'), 'single operation should not emit V325');
    });

    it('should not flag repository interfaces', () => {
        const code = `package com.example.repository;
import org.springframework.data.jpa.repository.JpaRepository;
interface OrderRepository extends JpaRepository<Order, Long> {
    Order findByCode(String code);
}`;
        const violations = analyze(code, { fatInterfaceMethodLimit: 2 });
        assert.ok(!violations.some(v => v.code === 'RICA-V325'), 'repository interface should be exempt');
    });
});

describe('DesignPatternAnalyzer - V326 Missing Memento', () => {

    it('should flag mutable classes with snapshot and restore behavior', () => {
        const code = `package com.example.domain;
class EditorSession {
    private String text;
    private int cursor;
    private String selection;
    private boolean dirty;

    public void saveState() {
        backupText = text;
        backupCursor = cursor;
    }
    public void restoreState() {
        text = backupText;
        cursor = backupCursor;
        dirty = false;
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V326'), 'should emit V326 for manual snapshot/restore state');
    });

    it('should not flag request/response DTOs', () => {
        const code = `package com.example.dto;
class EditorResponse {
    private String text;
    private int cursor;
    public void saveState() {}
    public void restoreState() {}
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V326'), 'DTO shape should be exempt');
    });

    it('should not flag classes without mutable state', () => {
        const code = `package com.example.domain;
class AuditSnapshot {
    private final String value = "";
    public void saveState() {}
    public void restoreState() {}
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V326'), 'immutable class should not emit V326');
    });
});

describe('DesignPatternAnalyzer - V327 Missing Iterator', () => {

    it('should flag public getter exposing an internal mutable collection', () => {
        const code = `package com.example.domain;
import java.util.List;
class OrderBook {
    private List<Order> orders;
    public List<Order> getOrders() {
        return orders;
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V327'), 'should emit V327 for mutable collection getter');
    });

    it('should not flag DTO collection getters used for serialization', () => {
        const code = `package com.example.dto;
import java.util.List;
class OrderResponse {
    private List<OrderItemResponse> items;
    public List<OrderItemResponse> getItems() {
        return items;
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V327'), 'DTO collection getter should be exempt');
    });

    it('should not flag read-only Iterable return types', () => {
        const code = `package com.example.domain;
import java.util.List;
class OrderBook {
    private List<Order> orders;
    public Iterable<Order> orders() {
        return orders;
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V327'), 'Iterable is a safer traversal boundary');
    });
});

describe('DesignPatternAnalyzer - V328 Interpreter Candidate', () => {

    it('should flag expression-like parsing with branching', () => {
        const code = `package com.example.service;
class RuleEvaluator {
    public boolean evaluate(String rule) {
        if (rule.startsWith("age")) return true;
        if (rule.contains("status")) return true;
        if (rule.endsWith("vip")) return true;
        if (rule.matches(".*active.*")) return true;
        if (rule.split(":").length > 1) return true;
        return false;
    }
}`;
        const violations = analyze(code);
        assert.ok(violations.some(v => v.code === 'RICA-V328'), 'should emit V328 for ad hoc rule parsing');
    });

    it('should not flag ordinary small string parsing', () => {
        const code = `package com.example.service;
class SlugService {
    public String createSlug(String title) {
        return title.toLowerCase().replace(" ", "-");
    }
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V328'), 'small string formatting should not emit V328');
    });

    it('should not flag repository query method declarations', () => {
        const code = `package com.example.repository;
interface PatientRepository {
    Patient findByStatusAndName(String status, String name);
}`;
        const violations = analyze(code);
        assert.ok(!violations.some(v => v.code === 'RICA-V328'), 'repository query declarations should be exempt');
    });
});

describe('DesignPatternAnalyzer — no-op gating', () => {

    it('should emit nothing for design-pattern rules when design-pattern checks are disabled', () => {
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
            || v.code === 'RICA-V310'
            || v.code === 'RICA-V324'
            || v.code === 'RICA-V325'
            || v.code === 'RICA-V326'
            || v.code === 'RICA-V327'
            || v.code === 'RICA-V328'), 'disabled checks should suppress design-pattern rules');
    });
});
