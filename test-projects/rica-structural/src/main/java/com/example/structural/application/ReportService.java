package com.example.structural.application;

import java.util.List;

public class ReportService {
    // V315 flyweight — Money in loop
    public void render(List<Row> rows){
        for(Row r: rows){
            Money m = new Money(r.amount, "USD");
            System.out.println(m);
        }
    }
    static class Row{ double amount; }
    static class Money{ Money(double a,String c){} }
}
