package com.example.bad.service;

import com.example.bad.repository.OrderRepository;
import com.example.bad.controller.OrderController; // V402 + V501: service -> controller (forbidden)
import com.example.bad.entity.OrderEntity;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    // V102 uninjected repository (no @Autowired, no constructor)
    private OrderRepository orderRepository;

    // V101 self-instantiation
    public void badCreate() {
        OrderRepository repo = new OrderRepository(); // V101
        repo.findAll();
    }

    // V104 anemic service — only delegation
    public java.util.List<OrderEntity> findAll(){ return orderRepository.findAll(); }
    public OrderEntity findById(Long id){ return orderRepository.findById(id); }

    public void approve(Long id){
        OrderController ctrl = new OrderController(); // V101 + V402
        ctrl.fake();
    }

    // For V323 cycle test — depends on PaymentService
    private PaymentService paymentService;
    public void pay(){ paymentService.charge(); }
}
