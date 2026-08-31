package com.example.structural.application;

import org.springframework.stereotype.Service;

@Service
public class ThreadService {
    // V306 raw thread
    @Async
    public void runAsync(){ new Thread(() -> System.out.println("hi")).start(); }
}
