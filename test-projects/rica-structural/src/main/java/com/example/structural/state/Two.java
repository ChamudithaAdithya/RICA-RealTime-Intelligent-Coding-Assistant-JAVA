package com.example.structural.state;

public class Two {
    // V316 scattered state checks
    // RICA-V316 FIX:
    // Reuse the same State abstraction instead of checking PENDING here again.
    // This keeps state-specific behavior in one polymorphic place.
    // Example fixed shape:
    //   o.state().handleSecondOperation(o);
    public void y(One.Order o) {
        if (o.getStatus() == One.Status.PENDING) {
            System.out.println("b");
        }
    }
}
