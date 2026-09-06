package com.example.structural.application;

import com.example.structural.presentation.PresentationBoundaryTarget;

public class BoundaryLeakService {
    private PresentationBoundaryTarget controller;

    public void leak() {
        controller.send();
    }
}
