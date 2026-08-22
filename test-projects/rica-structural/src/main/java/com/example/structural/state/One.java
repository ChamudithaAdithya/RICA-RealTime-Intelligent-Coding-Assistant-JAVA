package com.example.structural.state;
public class One { public void x(Order o){ if(o.getStatus() == Status.PENDING){ System.out.println("a"); }} static class Order{ Status getStatus(){return Status.PENDING;}} enum Status{PENDING, DONE} }
