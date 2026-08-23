package com.example.structural.application;

public class FacadeClient5 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
