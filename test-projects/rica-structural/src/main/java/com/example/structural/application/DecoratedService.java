package com.example.structural.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DecoratedService {
    private Logger logger = LoggerFactory.getLogger(DecoratedService.class);
    private OrderRepository repo;
    private PaymentGateway paymentGateway;
    private AuditSink auditSink;
    // V313 missing decorator — logger interleaved
    // RICA-V313 FIX:
    // Move cross-cutting logging/auditing into a decorator, interceptor, or aspect.
    // Keep this method focused on business work instead of repeated support calls.
    // Example fixed shape:
    //   OrderService service = new LoggingOrderServiceDecorator(coreOrderService);
    // and keep save() focused on validate, authorize, and persist.
    public void save(Order o) {
        logger.info("start");
        if (o == null) {
            logger.warn("missing order");
            return;
        }
        repo.validate(o);
        logger.debug("validated");
        repo.prepare(o);
        logger.trace("prepared");
        paymentGateway.authorize(o);
        logger.info("authorized");
        repo.save(o);
        auditSink.record(o);
        logger.info("end");
    }
    static class Order {}
    static class OrderRepository { void validate(Order o) {} void prepare(Order o) {} void save(Order o) {} }
    static class PaymentGateway { void authorize(Order o) {} }
    static class AuditSink { void record(Order o) {} }
}
