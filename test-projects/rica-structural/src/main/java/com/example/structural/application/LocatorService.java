package com.example.structural.application;
import org.springframework.context.ApplicationContext;
public class LocatorService {
    private ApplicationContext ctx;
    // V320 service locator
    // RICA-V320 FIX:
    // Inject OrderRepository directly through the constructor.
    // Avoid ApplicationContext.getBean() in business code.
    // Example fixed shape:
    //   private final OrderRepository repository;
    //   LocatorService(OrderRepository repository) { this.repository = repository; }
    public void run(){ OrderRepository r = ctx.getBean(OrderRepository.class); }
    static class OrderRepository{}
}
