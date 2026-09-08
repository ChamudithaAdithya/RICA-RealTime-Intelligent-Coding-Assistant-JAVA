package com.example.structural.application;

import java.util.List;

class AdvancedPatternOpportunities {
    private InventoryService inventoryService;
    private PaymentClient paymentClient;
    private FraudValidator fraudValidator;
    private ShippingManager shippingManager;
    private EmailNotifier emailNotifier;
    private AuditPublisher auditPublisher;

    // V324 mediator candidate
    // RICA-V324 FIX:
    // Introduce a CheckoutMediator or workflow coordinator.
    // The mediator should coordinate inventory, fraud, payment, shipping, email, and audit steps.
    // Example fixed shape:
    //   checkoutMediator.checkout(order);
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
}

class ReportVisitorCandidate {
    // V325 visitor candidate
    // RICA-V325 FIX:
    // Add an accept(Visitor) method to Node and move operations into visitor classes.
    // This avoids repeating the same instanceof dispatch for every new operation.
    // Example fixed shape:
    //   return node.accept(new RenderVisitor());
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
}

class EditorSession {
    private String text;
    private String backupText;
    private int cursor;
    private int backupCursor;
    private String selection;
    private boolean dirty;

    // V326 memento candidate
    // RICA-V326 FIX:
    // Store editor state in a Memento object instead of scattered backup fields.
    // Restore by applying the saved snapshot through one clear API.
    // Example fixed shape:
    //   EditorMemento snapshot = session.createMemento();
    //   session.restore(snapshot);
    public void saveState() {
        backupText = text;
        backupCursor = cursor;
    }

    public void restoreState() {
        text = backupText;
        cursor = backupCursor;
        dirty = false;
    }
}

class OrderBook {
    private List<Order> orders;

    // V327 iterator candidate
    // RICA-V327 FIX:
    // Return an Iterator, Stream, or read-only view instead of the mutable collection.
    // Callers should not depend on the internal collection representation.
    // Example fixed shape:
    //   public Iterable<Order> orders() { return Collections.unmodifiableList(orders); }
    public List<Order> getOrders() {
        return orders;
    }
}

class RuleEvaluator {
    // V328 interpreter candidate
    // RICA-V328 FIX:
    // Parse rule strings into expression objects and evaluate the expression tree.
    // Keep parsing grammar separate from business evaluation behavior.
    // Example fixed shape:
    //   RuleExpression expression = parser.parse(rule);
    //   return expression.evaluate(context);
    public boolean evaluate(String rule) {
        if (rule.startsWith("age")) return true;
        if (rule.contains("status")) return true;
        if (rule.endsWith("vip")) return true;
        if (rule.matches(".*active.*")) return true;
        if (rule.split(":").length > 1) return true;
        return false;
    }
}

class Order {
    boolean express;
}

class InventoryService {
    void reserve(Order order) {}
    void confirm(Order order) {}
}

class PaymentClient {
    void authorize(Order order) {}
    void capture(Order order) {}
}

class FraudValidator {
    void validate(Order order) {}
}

class ShippingManager {
    void scheduleExpress(Order order) {}
    void schedule(Order order) {}
}

class EmailNotifier {
    void send(Order order) {}
}

class AuditPublisher {
    void publish(Order order) {}
}

interface Node {}
class TextNode implements Node {}
class ImageNode implements Node {}
class TableNode implements Node {}
