package com.example.structural.application;

public class NullService {
    public String render(Order order, User user, Address address) {
        if (order == null) return "";
        if (user == null) return "";
        if (address == null) return "";
        return user.name + address.city;
    }

    static class Order { }
    static class User { String name; }
    static class Address { String city; }
}
