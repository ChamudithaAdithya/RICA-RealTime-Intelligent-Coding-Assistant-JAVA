package com.example.structural.application;

import org.springframework.stereotype.Service;

@Service
public class ConstructionService {
    // V308 leaking construction + ternary branching
    // RICA-V308 FIX:
    // Move complex object creation into a Builder, Factory, or named creation method.
    // Keep business methods focused on workflow, not construction details.
    // Example fixed shape:
    //   return orderFactory.createFastOrder();
    // or:
    //   return Order.builder().address(address).build();
    public Order build(boolean fast){
        return new Order(fast ? new Address("A",10) : new Address("B",20));
    }
    static class Order { Order(Address a){} }
    static class Address { Address(String s,int n){} Address(String s,int n, String c){} }
}
