package com.example.structural.application;

public class SqlOrderFactory {
    // V304/V312 factory smell
    // RICA-V304/RICA-V312 FIX:
    // Centralize related creation choices behind one factory or abstract factory.
    // Avoid scattered factory classes that each know only part of the product family.
    // Example fixed shape:
    //   OrderFactory factory = factories.get("sql");
    //   return factory.createOrder();
    public Order create() {
        return new Order();
    }

    static class Order {}
}
