package com.example.structural.application;

public class FacadeClient7 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
