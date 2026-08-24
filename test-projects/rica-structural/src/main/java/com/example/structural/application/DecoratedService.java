package com.example.structural.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DecoratedService {
    private Logger logger = LoggerFactory.getLogger(DecoratedService.class);
    private OrderRepository repo;
    // V313 missing decorator — logger interleaved
    public void save(Order o){
        logger.info("start");
        repo.save(o);
        logger.info("end");
    }
    static class Order{}
    static class OrderRepository{ void save(Order o){} }
}
