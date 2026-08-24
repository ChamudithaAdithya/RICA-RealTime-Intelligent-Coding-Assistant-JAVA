package com.example.structural.application;

public class CopyService {
    // V311 prototype — 3 getter->setter pairs same type
    public void copy(Order from){
        Order to = new Order();
        to.setId(from.getId());
        to.setName(from.getName());
        to.setQty(from.getQty());
    }
    static class Order{ private Long id; private String name; private int qty;
        Long getId(){return id;} String getName(){return name;} int getQty(){return qty;}
        void setId(Long v){id=v;} void setName(String v){name=v;} void setQty(int v){qty=v;}
    }
}
