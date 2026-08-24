package com.example.structural.application;

public class FacadeClient2 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
