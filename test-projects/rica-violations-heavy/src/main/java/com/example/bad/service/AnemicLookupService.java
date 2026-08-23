package com.example.bad.service;

import com.example.bad.repository.OrderRepository;
import org.springframework.stereotype.Service;

@Service
public class AnemicLookupService {
    private OrderRepository orderRepository;

    public Object find(Long id) {
        return orderRepository.findById(id);
    }

    public long count() {
        return orderRepository.count();
    }
}
