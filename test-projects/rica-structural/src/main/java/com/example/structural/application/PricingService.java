package com.example.structural.application;

import org.springframework.stereotype.Service;

@Service
public class PricingService {
    // V303 strategy missing — 4 if-else on same var
    public double price(String type, double amount){
        if(type.equals("REGULAR")) return amount;
        else if(type.equals("VIP")) return amount*0.8;
        else if(type.equals("STAFF")) return amount*0.9;
        else if(type.equals("SEASONAL")) return amount*0.85;
        throw new IllegalArgumentException("unknown");
    }
}
