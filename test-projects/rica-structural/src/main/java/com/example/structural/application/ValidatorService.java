package com.example.structural.application;
public class ValidatorService {
    private Processor processor;

    // V319 long processing pipeline with several guards and real work
    public void processPipeline(Order o) {
        if (o == null) {
            throw new IllegalArgumentException();
        }
        if (o.id == null) {
            throw new IllegalArgumentException();
        }
        if (o.name == null) {
            throw new IllegalArgumentException();
        }
        if (o.qty < 0) {
            throw new IllegalArgumentException();
        }
        if (o.price < 0) {
            throw new IllegalArgumentException();
        }
        if (o.status == null) {
            throw new IllegalArgumentException();
        }
        if (o.customer == null) {
            throw new IllegalArgumentException();
        }
        if (o.customerBlocked) {
            throw new IllegalStateException();
        }
        processor.normalize(o);
        processor.price(o);
        processor.reserve(o);
        processor.persist(o);
    }
    static class Order { Long id; String name; String status; String customer; int qty; double price; boolean customerBlocked; }
    static class Processor { void normalize(Order o) {} void price(Order o) {} void reserve(Order o) {} void persist(Order o) {} }
}
