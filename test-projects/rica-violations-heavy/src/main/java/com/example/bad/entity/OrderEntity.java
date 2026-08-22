package com.example.bad.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.springframework.jdbc.core.JdbcTemplate;
import com.example.bad.service.OrderService; // V107 direct layer access
import com.example.bad.controller.OrderController; // V402 cross-layer

@Entity
public class OrderEntity {
    @Id public Long id;
    public String status;

    // V108 anemic — only getters/setters, no behavior
    public Long getId(){ return id; }
    public void setId(Long id){ this.id=id; }
    public String getStatus(){ return status; }
    public void setStatus(String s){ this.status=s; }

    // V109 improper data access — JDBC inside entity
    private JdbcTemplate jdbcTemplate;
    public void load() {
        jdbcTemplate.queryForList("SELECT * FROM orders");
    }

    // V107 direct layer access — entity calls service
    private OrderService orderService;
    public void approve() { orderService.approve(this.id); }

    // V106 business logic in entity — heavy branching
    public double calc() {
        double total=0;
        for(int i=0;i<10;i++){ if(i%2==0) total+=i*1.5; else if(total>5) total-=1; }
        if(total>100) total-=50;
        return total;
    }
}
