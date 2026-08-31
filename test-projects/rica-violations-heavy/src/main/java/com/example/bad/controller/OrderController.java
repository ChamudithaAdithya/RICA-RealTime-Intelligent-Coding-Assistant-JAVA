package com.example.bad.controller;

import com.example.bad.entity.OrderEntity;
import com.example.bad.repository.OrderRepository;
import com.example.bad.service.OrderService;
import com.example.bad.dto.OrderDto;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/orders")
public class OrderController {
    @Autowired
    // V103 uninjected service
    private OrderService orderService;
    // V401 controller bypass — direct repository
    private OrderRepository orderRepository;

    // V113 static cache
    static Map<String,String> cache = new HashMap<>();

    // V106 business logic in controller
    @PostMapping("/calc")
    public double calc(@RequestBody OrderDto dto){
        double total=0;
        for(int i=0;i<10;i++){
            if(i%2==0) total+=i*1.5;
            else if(total>5) total-=1;
            if(dto.id!=null) total+= dto.id;
        }
        if(total>100) total-=50;
        return total;
    }

    // V101 self-instantiation in controller
    @GetMapping("/bad")
    public String bad(){
        return orderService.findAll().toString();
    }

    // V110 direct HTTP call
    @GetMapping("/http")
    public String http(){
        RestTemplate rt = new RestTemplate();
        return rt.getForObject("https://example.com", String.class);
    }

    // V111 file I/O
    @GetMapping("/file")
    public String file() throws Exception {
        File f = new File("/tmp/x.txt");
        return Files.readString(Paths.get(f.getPath()));
    }

    // V112 background thread
    @PostMapping("/thread")
    public void thread(){
        new Thread(() -> System.out.println("hi")).start();
    }

    // V114 raw SQL / DataSource
    @GetMapping("/sql")
    public String sql() throws Exception {
        DataSource ds = null;
        return ds.getConnection().toString();
    }

    // V201 exposing entity (also V404 cross-file)
    @GetMapping("/entity")
    public OrderEntity getEntity(@RequestParam Long id){
        return orderRepository.findById(id);
    }

    // V202 missing DTO — takes entity as param
    @PostMapping("/create-entity")
    public String createEntity(@RequestBody OrderEntity entity){ return "ok"; }

    // V203 improper error handling + V206 missing validation
    @GetMapping("/risk")
    public String risk(@RequestParam String id) throws Exception {
        if(id==null) throw new Exception("bad"); // V203 generic exception
        try { Integer.parseInt(id); } catch(Exception e){ e.printStackTrace(); } // V203
        return id;
    }

    // V204 business logic in resource (also controller as resource)
    @PostMapping("/discount")
    public double discount(@RequestBody OrderDto dto){
        double price=100;
        if(dto.note.equals("VIP")) price*=0.8;
        else if(dto.note.equals("STAFF")) price*=0.9;
        for(int i=0;i<5;i++) price+=i;
        return price;
    }

    // V205 direct service instantiation
    @GetMapping("/instantiate")
    public String instantiate(){
        com.example.bad.service.OrderService s = new com.example.bad.service.OrderService();
        return s.findAll().toString();
    }

    // V207 exposing internal structure (returns non-DTO internal type)
    public com.example.bad.service.OrderService getService(){ return orderService; }

    public void fake(){}
}
