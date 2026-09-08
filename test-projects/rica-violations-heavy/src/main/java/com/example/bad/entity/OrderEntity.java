package com.example.bad.entity;

import com.example.bad.controller.OrderController; // V402 cross-layer
// RICA-V402/RICA-V501 FIX:
// Domain/entity code must not depend on controllers.
// Move HTTP concerns to presentation classes and keep entities independent.
// Example fixed shape:
//   remove this import; controller maps HTTP input/output outside the entity.
import com.example.bad.service.OrderService; // V107 direct layer access
// RICA-V107 FIX:
// Remove service dependencies from entities.
// Entity behavior should be self-contained; services coordinate workflows.
// Example fixed shape:
//   public void approve() { this.status = "APPROVED"; }
// and OrderService decides when approve() is allowed.
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.springframework.jdbc.core.JdbcTemplate;

@Entity
public class OrderEntity {
    @Id public Long id;
    public String status;

    // V108 anemic - only getters/setters, no behavior
    // RICA-V108 FIX:
    // Add meaningful domain behavior or keep the object as a DTO instead.
    // Entities should protect their own invariants, not only store data.
    // Example fixed shape:
    //   public void markPaid() {
    //       if (!"PENDING".equals(status)) throw new IllegalStateException();
    //       this.status = "PAID";
    //   }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String s) { this.status = s; }

    // V109 improper data access - JDBC inside entity
    // RICA-V109 FIX:
    // Move JdbcTemplate/database calls to a repository.
    // Entities should not know how they are persisted.
    // Example fixed shape:
    //   class OrderRepository {
    //       List<Map<String,Object>> loadOrders() { return jdbcTemplate.queryForList(...); }
    //   }
    private JdbcTemplate jdbcTemplate;
    public void load() {
        jdbcTemplate.queryForList("SELECT * FROM orders");
    }

    // V107 direct layer access - entity calls service
    // RICA-V107 FIX:
    // Move approve workflow orchestration into OrderService.
    // The entity can expose a local approve state change if needed.
    // Example fixed shape:
    //   public void approve() { this.status = "APPROVED"; }
    private OrderService orderService;
    public void approve() {
        orderService.approve(this.id);
    }

    // V106 business logic in entity - heavy branching
    // RICA-V106 FIX:
    // Move cross-entity calculations/workflow rules to the service layer.
    // Keep only entity-owned invariant behavior inside the entity.
    // Example fixed shape:
    //   orderPricingService.calculateTotal(this);
    public double calc() {
        double total = 0;
        for (int i = 0; i < 10; i++) {
            if (i % 2 == 0) total += i * 1.5;
            else if (total > 5) total -= 1;
        }
        if (total > 100) total -= 50;
        return total;
    }
}
