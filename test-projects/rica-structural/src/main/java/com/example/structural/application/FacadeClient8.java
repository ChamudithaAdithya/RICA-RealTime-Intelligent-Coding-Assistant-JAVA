package com.example.structural.application;

public class FacadeClient8 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
