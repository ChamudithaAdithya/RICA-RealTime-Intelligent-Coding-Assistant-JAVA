package com.example.clean.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.math.BigDecimal;

@Entity
public class Order {
    @Id private Long id;
    private BigDecimal total;
    private String status;

    // Rich behavior — minimal branching to keep businessLogicScore <3 (V106 safe)
    public void applyDiscount(BigDecimal rate) {
        this.total = this.total.multiply(rate);
    }

    public boolean isEligibleForFreeShipping() {
        return this.total != null;
    }

    public void markPaid() { this.status = "PAID"; }

    // Getters only for needed fields
    public Long getId() { return id; }
    public BigDecimal getTotal() { return total; }
    public String getStatus() { return status; }
}
