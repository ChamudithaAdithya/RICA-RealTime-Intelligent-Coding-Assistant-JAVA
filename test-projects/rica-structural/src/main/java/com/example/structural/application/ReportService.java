package com.example.structural.application;

import java.util.List;

public class ReportService {
    // V315 flyweight — Money in loop
    // RICA-V315 FIX:
    // Reuse immutable shared value objects or move creation outside the hot loop.
    // Flyweight-style reuse avoids repeated heavy object allocation.
    // Example fixed shape:
    //   Currency usd = currencyFactory.get("USD");
    //   Money m = new Money(r.amount, usd);
    public void render(List<Row> rows){
        for(Row r: rows){
            Money m = new Money(r.amount, "USD");
            System.out.println(m);
        }
    }
    static class Row{ double amount; }
    static class Money{ Money(double a,String c){} }
}
