package com.example.structural.application;

public class FacadeClient4 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
