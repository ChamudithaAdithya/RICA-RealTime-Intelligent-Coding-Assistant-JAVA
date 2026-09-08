package com.example.structural.application;

import com.example.structural.presentation.PresentationBoundaryTarget;

public class BoundaryLeakService {
    // RICA-V501 FIX:
    // Application-layer code should not depend on presentation-layer classes.
    // Move the UI call outward or introduce an application port that presentation implements.
    // Example fixed shape:
    //   private BoundaryNotificationPort notificationPort;
    // where the port belongs to the application layer.
    private PresentationBoundaryTarget controller;

    public void leak() {
        controller.send();
    }
}
