package com.example.bad.repository;

import com.example.bad.entity.OrderEntity;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class OrderRepository {
    public OrderEntity findById(Long id){ return new OrderEntity(); }
    public List<OrderEntity> findAll(){ return List.of(); }
    public void save(OrderEntity e){}
}
