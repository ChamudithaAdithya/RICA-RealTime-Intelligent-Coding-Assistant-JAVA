package com.example.structural.state;

public class One {
    // V316 scattered state checks
    // RICA-V316 FIX:
    // Move PENDING/DONE behavior into state-specific classes.
    // Call order.getState().handle() instead of repeating status comparisons.
    // Example fixed shape:
    //   interface OrderState { void handle(Order order); }
    //   order.state().handle(order);
    public void x(Order o) {
        if (o.getStatus() == Status.PENDING) {
            System.out.println("a");
        }
    }

    static class Order {
        Status getStatus() { return Status.PENDING; }
    }

    enum Status { PENDING, DONE }
}
