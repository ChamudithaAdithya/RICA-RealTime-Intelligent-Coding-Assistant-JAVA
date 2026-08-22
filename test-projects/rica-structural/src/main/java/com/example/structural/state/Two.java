package com.example.structural.state;
public class Two { public void y(One.Order o){ if(o.getStatus() == One.Status.PENDING){ System.out.println("b"); }} }
