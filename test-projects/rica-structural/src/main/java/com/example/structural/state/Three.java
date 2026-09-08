package com.example.structural.state;

public class Three {
    // V316 scattered state checks
    // RICA-V316 FIX:
    // Replace repeated status conditionals with state objects.
    // Adding a new status should not require edits across many classes.
    // Example fixed shape:
    //   o.state().handleThirdOperation(o);
    public void z(One.Order o) {
        if (o.getStatus() == One.Status.PENDING) {
            System.out.println("c");
        }
    }
}
