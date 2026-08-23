package com.example.structural.application;

public class FacadeClient6 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
