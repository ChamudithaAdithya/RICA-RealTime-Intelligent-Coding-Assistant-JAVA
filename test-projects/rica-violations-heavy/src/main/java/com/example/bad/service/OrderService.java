package com.example.bad.service;

import com.example.bad.controller.OrderController; // V402 + V501: service -> controller
// RICA-V402/RICA-V501 FIX:
// Services must not depend on controllers or presentation packages.
// Move request/response handling to the controller and keep services UI-free.
// Example fixed shape:
//   import com.example.bad.dto.OrderDto;
//   public OrderDto approve(Long id) { ... }
import com.example.bad.entity.OrderEntity;
import com.example.bad.repository.OrderRepository;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private OrderRepository orderRepository;

    public void badCreate() {
        OrderRepository repo = new OrderRepository(); // V101
        repo.findAll();
    }

    public java.util.List<OrderEntity> findAll() { return orderRepository.findAll(); }
    public OrderEntity findById(Long id) { return orderRepository.findById(id); }

    public void approve(Long id) {
        OrderController ctrl = new OrderController(); // V101 + V402
        ctrl.fake();
    }

    private PaymentService paymentService;
    public void pay() { paymentService.charge(); }
}
