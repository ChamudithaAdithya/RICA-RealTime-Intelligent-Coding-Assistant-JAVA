package com.example.structural.application;
public class ValidatorService {
    // V319 5 guards
    public void validate(Order o){
        if(o==null) throw new IllegalArgumentException();
        if(o.id==null) throw new IllegalArgumentException();
        if(o.name==null) throw new IllegalArgumentException();
        if(o.qty<0) throw new IllegalArgumentException();
        if(o.price<0) throw new IllegalArgumentException();
    }
    static class Order{ Long id; String name; int qty; double price; }
}
