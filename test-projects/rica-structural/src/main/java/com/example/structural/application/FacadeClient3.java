package com.example.structural.application;

public class FacadeClient3 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
