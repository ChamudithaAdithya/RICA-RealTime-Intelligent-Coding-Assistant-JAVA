package com.example.structural.application;

import com.example.structural.domain.FatInterface;

public class FatInterfaceClient {
    private final FatInterface fatInterface;

    public FatInterfaceClient(FatInterface fatInterface) {
        this.fatInterface = fatInterface;
    }

    public void useSmallPart() {
        fatInterface.a();
        fatInterface.b();
    }
}
