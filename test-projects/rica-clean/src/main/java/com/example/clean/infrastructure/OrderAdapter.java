package com.example.clean.infrastructure;

import com.example.clean.domain.Order;
import com.example.clean.domain.OrderPort;
import org.springframework.stereotype.Repository;

@Repository
public class OrderAdapter implements OrderPort {
    // In-memory for demo — no external SDK leak (V301 safe)
    @Override public Order findById(Long id) { return new Order(); }
    @Override public void save(Order order) { /* persist */ }
}
