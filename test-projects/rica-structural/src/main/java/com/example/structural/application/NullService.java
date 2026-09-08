package com.example.structural.application;

public class NullService {
    // RICA-V321 FIX:
    // Replace repeated defensive null checks with validation, Optional, or Null Object values.
    // Keep the main rendering logic readable after inputs are normalized.
    // Example fixed shape:
    //   User safeUser = Optional.ofNullable(user).orElse(User.guest());
    //   return renderer.render(order, safeUser, address, payment, shipment);
    public String render(Order order, User user, Address address, Payment payment, Shipment shipment) {
        if (order == null) return "";
        if (user == null) return "";
        if (address == null) return "";
        if (payment == null) return "";
        if (shipment == null) return "";
        return user.name + address.city + shipment.code;
    }

    static class Order {}
    static class User { String name; }
    static class Address { String city; }
    static class Payment {}
    static class Shipment { String code; }
}
