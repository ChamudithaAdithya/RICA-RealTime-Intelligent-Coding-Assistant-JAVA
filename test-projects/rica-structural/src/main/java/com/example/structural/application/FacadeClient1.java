package com.example.structural.application;

public class FacadeClient1 {
    private MegaFacade facade;

    public void call() {
        facade.delegate1();
    }
}
