package com.example.structural.application;
public class NullService {
    // V321 3 null checks
    public String render(Order o){
        if(o==null) return "";
        if(o.user==null) return "";
        if(o.user.name==null) return "";
        return o.user.name;
    }
    static class Order{ User user; } static class User{ String name; }
}
