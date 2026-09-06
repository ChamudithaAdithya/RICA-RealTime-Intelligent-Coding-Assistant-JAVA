package com.example.bad.controller;

import javax.annotation.Resource;

@Resource
public class JaxOrderResource {
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
