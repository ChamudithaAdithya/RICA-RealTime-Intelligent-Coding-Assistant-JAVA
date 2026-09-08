package com.example.structural.application;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ThreadService {
    // V306 raw thread
    // RICA-V306 FIX:
    // Use Spring @Async, TaskExecutor, or a queue instead of new Thread().
    // Let the framework manage thread lifecycle, errors, and resource limits.
    // Example fixed shape:
    //   taskExecutor.execute(() -> notificationService.send());
    // or keep @Async and remove the manual new Thread().
    @Async
    public void runAsync(){ new Thread(() -> System.out.println("hi")).start(); }
}
