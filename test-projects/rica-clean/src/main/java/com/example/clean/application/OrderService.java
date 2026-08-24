package com.example.clean.application;

import com.example.clean.domain.Order;
import com.example.clean.domain.OrderPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
public class OrderService {
    private final OrderPort orderPort;

    // Constructor injection — no V101/V102
    public OrderService(OrderPort orderPort) {
        this.orderPort = orderPort;
    }

    @Transactional
    public void placeOrder(Long id, BigDecimal discount) {
        Order order = orderPort.findById(id);
        order.applyDiscount(discount);
        if (order.isEligibleForFreeShipping()) {
            order.markPaid();
        }
        orderPort.save(order);
    }
}
