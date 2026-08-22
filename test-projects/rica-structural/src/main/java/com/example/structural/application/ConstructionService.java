package com.example.structural.application;

import org.springframework.stereotype.Service;

@Service
public class ConstructionService {
    // V308 leaking construction + ternary branching
    public Order build(boolean fast){
        return new Order(fast ? new Address("A",10) : new Address("B",20));
    }
    static class Order { Order(Address a){} }
    static class Address { Address(String s,int n){} Address(String s,int n, String c){} }
}
