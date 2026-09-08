package com.example.bad.service;

import com.example.bad.repository.OrderRepository;
import org.springframework.stereotype.Service;

@Service
public class AnemicLookupService {
    // RICA-V102 FIX:
    // Inject the repository through a constructor and make the field final.
    // Avoid nullable or manually wired repository fields.
    // Example fixed shape:
    //   private final OrderRepository orderRepository;
    //   AnemicLookupService(OrderRepository orderRepository) { this.orderRepository = orderRepository; }
    private OrderRepository orderRepository;

    // RICA-V104 FIX:
    // A service should own application behavior, not only forward repository calls.
    // Add validation/orchestration here or remove the extra service abstraction.
    // Example fixed shape:
    //   validateLookupRequest(id);
    //   return orderRepository.findById(id);
    public Object find(Long id) {
        return orderRepository.findById(id);
    }

    public long count() {
        return orderRepository.count();
    }
}
