package com.example.clean.presentation;

// DTO — no entity leak (V201/V404 safe)
public class OrderResponse {
    private Long id;
    private String status;
    public OrderResponse(Long id, String status) { this.id=id; this.status=status; }
    public Long getId(){ return id; }
    public String getStatus(){ return status; }
}
