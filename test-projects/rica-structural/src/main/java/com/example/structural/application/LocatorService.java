package com.example.structural.application;
import org.springframework.context.ApplicationContext;
public class LocatorService {
    private ApplicationContext ctx;
    // V320 service locator
    public void run(){ OrderRepository r = ctx.getBean(OrderRepository.class); }
    static class OrderRepository{}
}
