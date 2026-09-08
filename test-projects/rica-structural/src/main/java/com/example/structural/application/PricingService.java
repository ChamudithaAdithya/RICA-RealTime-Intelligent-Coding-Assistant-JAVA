package com.example.structural.application;

import org.springframework.stereotype.Service;

@Service
public class PricingService {
    // V303 strategy missing - four branches select behavior from one discriminator.
    // RICA-V303 FIX:
    // Replace discriminator branches with pricing strategy classes.
    // Select the correct strategy from a map/factory and delegate price calculation.
    // Example fixed shape:
    //   PricingStrategy strategy = strategies.get(type);
    //   return strategy.price(amount);
    public double price(String type, double amount) {
        if (type == "REGULAR") {
            return amount;
        }
        if (type == "VIP") {
            return amount * 0.8;
        }
        if (type == "STAFF") {
            return amount * 0.9;
        }
        if (type == "SEASONAL") {
            return amount * 0.85;
        }
        throw new IllegalArgumentException("unknown");
    }
}
