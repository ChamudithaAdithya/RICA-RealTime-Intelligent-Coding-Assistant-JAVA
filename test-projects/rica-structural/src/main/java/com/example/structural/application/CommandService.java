package com.example.structural.application;

import org.springframework.stereotype.Service;

@Service
public class CommandService {
    private OrderRepository repo;
    // V310 missing command — 2 writes + complexity >=6
    public void process(Order o){
        if(o==null) throw new IllegalArgumentException();
        if(o.total<0) throw new IllegalArgumentException();
        if(o.flag){ if(o.second){ repo.save(o); }}
        repo.deleteById(o.id);
        if(o.active) repo.saveAgain(o);
    }
    static class Order{ double total; boolean flag, second, active; Long id; }
    static class OrderRepository{ void save(Order o){} void deleteById(Long id){} void saveAgain(Order o){} }
}
