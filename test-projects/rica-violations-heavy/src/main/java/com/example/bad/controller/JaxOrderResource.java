package com.example.bad.controller;

import javax.annotation.Resource;

@Resource
public class JaxOrderResource {
    // RICA-V204 FIX:
    // Move discount rules and loops to a service method.
    // The resource should only accept input and return the service result.
    // Example fixed shape:
    //   return orderPricingService.calculateDiscount(dto);
    public double calculateDiscount(OrderDto dto) {
        double price = 100;
        if (dto.vip) price = price * 0.8;
        if (dto.staff) price = price * 0.9;
        for (int i = 0; i < 5; i++) {
            price += i;
        }
        return price;
    }

    static class OrderDto {
        boolean vip;
        boolean staff;
    }
}
