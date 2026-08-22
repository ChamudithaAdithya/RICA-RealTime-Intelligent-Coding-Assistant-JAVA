package com.example.clean.domain;

// Port — abstraction for persistence (hexagonal)
public interface OrderPort {
    Order findById(Long id);
    void save(Order order);
}
