package com.example.bad.service;

import org.springframework.stereotype.Service;

@Service
public class PaymentService {
    // Cycle: PaymentService -> OrderService -> PaymentService (V403)
    // RICA-V403 FIX:
    // Break the circular dependency using a smaller collaborator or domain event.
    // One service should not depend on another service that depends back on it.
    // Example fixed shape:
    //   paymentWorkflow.chargeOrder(orderId);
    // or listen for OrderApprovedEvent instead of calling OrderService directly.
    private OrderService orderService;
    public void charge(){ orderService.findAll(); }
}
