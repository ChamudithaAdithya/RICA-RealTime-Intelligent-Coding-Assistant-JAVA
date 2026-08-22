package com.example.bad.service;

import org.springframework.stereotype.Service;

@Service
public class PaymentService {
    // Cycle: PaymentService -> OrderService -> PaymentService (V403)
    private OrderService orderService;
    public void charge(){ orderService.findAll(); }
}
