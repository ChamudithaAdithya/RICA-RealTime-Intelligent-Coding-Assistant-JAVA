package com.example.bad.controller;

import com.example.bad.dto.OrderDto;
import com.example.bad.entity.OrderEntity;
import com.example.bad.repository.OrderRepository;
import com.example.bad.service.OrderService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import javax.sql.DataSource;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }



    // V103 uninjected service
    // RICA-V103 FIX:
    // Inject services through a constructor or supported DI annotation.
    // Controllers should receive collaborators from Spring instead of hiding wiring.
    // Example fixed shape:
    //   private final OrderService orderService;
    //   public OrderController(OrderService orderService) {
    //       this.orderService = orderService;
    //   }

    // V401 controller bypass - direct repository
    // RICA-V401 FIX:
    // Remove the repository from the controller and call OrderService instead.
    // The service layer should coordinate persistence access.
    // Example fixed shape:
    //   @GetMapping("/entity")
    //   public OrderDto getEntity(@RequestParam Long id) {
    //       return orderService.findOrderDtoById(id);
    //   }
    private OrderRepository orderRepository;

    // V113 static cache
    // RICA-V113 FIX:
    // Move cache state to a dedicated cache/service bean.
    // Controllers should not hold static mutable state.
    // Example fixed shape:
    //   private final OrderCache orderCache;
    //   orderCache.put(orderId, status);
    static Map<String, String> cache = new HashMap<>();

    // V106 business logic in controller
    // RICA-V106 FIX:
    // Move this calculation and branching into OrderService.
    // The controller should validate input, call the service, and return output.
    // RICA-V206 FIX:
    // Add @Valid and constraint annotations to request DTOs/parameters.
    // Example fixed shape:
    //   public double calc(@Valid @RequestBody OrderDto dto) {
    //       return orderService.calculateTotal(dto);
    //   }
    @PostMapping("/calc")
    public double calc(@RequestBody OrderDto dto) {
        double total = 0;
        for (int i = 0; i < 10; i++) {
            if (i % 2 == 0) total += i * 1.5;
            else if (total > 5) total -= 1;
            if (dto.id != null) total += dto.id;
        }
        if (total > 100) total -= 50;
        return total;
    }

    // V101 self-instantiation in controller
    // RICA-V101 FIX:
    // Do not construct services/repositories with new inside controllers.
    // Inject the required service through constructor injection.
    // Example fixed shape:
    //   return orderService.findAll().toString();
    // with orderService supplied by the constructor.
    @GetMapping("/bad")
    public String bad() {
        return orderService.findAll().toString();
    }

    // V110 direct HTTP call
    // RICA-V110 FIX:
    // Move RestTemplate/WebClient calls to an infrastructure gateway service.
    // The controller should call that gateway through an injected service.
    // Example fixed shape:
    //   return externalOrderGateway.fetchRemoteOrderStatus();
    @GetMapping("/http")
    public String http() {
        RestTemplate rt = new RestTemplate();
        return rt.getForObject("https://example.com", String.class);
    }

    // V111 file I/O
    // RICA-V111 FIX:
    // Move file reading/writing to a FileStorageService or gateway.
    // The controller should only pass request values and return the response.
    // Example fixed shape:
    //   return fileStorageService.readOrderFile(fileName);
    @GetMapping("/file")
    public String file() throws Exception {
        File f = new File("/tmp/x.txt");
        return Files.readString(Paths.get(f.getPath()));
    }

    // V112 background thread
    // RICA-V112 FIX:
    // Move async work to a service using @Async, TaskExecutor, or messaging.
    // Controllers should not create or manage threads directly.
    // Example fixed shape:
    //   orderJobService.startOrderJob();
    @PostMapping("/thread")
    public void thread() {
        new Thread(() -> System.out.println("hi")).start();
    }

    // V114 raw SQL / DataSource
    // RICA-V114 FIX:
    // Move database access to repository/service classes.
    // Controllers should not use DataSource, Connection, or SQL APIs directly.
    // Example fixed shape:
    //   return orderService.loadOrderSummary(id);
    @GetMapping("/sql")
    public String sql() throws Exception {
        DataSource ds = null;
        return ds.getConnection().toString();
    }

    // V201 exposing entity (also V404 cross-file)
    // RICA-V201/RICA-V404 FIX:
    // Return an OrderDto/OrderResponse instead of OrderEntity.
    // API responses should not expose persistence/domain internals.
    // Example fixed shape:
    //   public OrderDto getEntity(@RequestParam Long id) {
    //       return orderService.findOrderDtoById(id);
    //   }
    @GetMapping("/entity")
    public OrderEntity getEntity(@RequestParam Long id) {
        return orderRepository.findById(id);
    }

    // V202 missing DTO - takes entity as param
    // RICA-V202 FIX:
    // Accept a request DTO and map it to the entity inside the service layer.
    // Do not bind HTTP request bodies directly to persistence entities.
    // Example fixed shape:
    //   public String createEntity(@Valid @RequestBody CreateOrderRequest request) {
    //       orderService.createOrder(request);
    //       return "ok";
    //   }
    @PostMapping("/create-entity")
    public String createEntity(@RequestBody OrderEntity entity) {
        return "ok";
    }

    // V203 improper error handling + V206 missing validation
    // RICA-V203 FIX:
    // Use a specific exception and handle it through @ExceptionHandler or advice.
    // Do not throw generic Exception or print stack traces from controllers.
    // RICA-V206 FIX:
    // Add validation annotations such as @NotNull, @Positive, or @Valid.
    // Example fixed shape:
    //   public String risk(@RequestParam @NotBlank String id) {
    //       return orderService.validateRisk(id);
    //   }
    // and handle InvalidOrderRequestException in @ControllerAdvice.
    @GetMapping("/risk")
    public String risk(@RequestParam String id) throws Exception {
        if (id == null) throw new Exception("bad"); // V203 generic exception
        try { Integer.parseInt(id); } catch (Exception e) { e.printStackTrace(); } // V203
        return id;
    }

    // V204 business logic in resource (also controller as resource)
    // RICA-V204 FIX:
    // Move discount decisions and loops to OrderService.
    // The API method should delegate and shape the HTTP response only.
    // Example fixed shape:
    //   public double discount(@Valid @RequestBody OrderDto dto) {
    //       return orderService.calculateDiscount(dto);
    //   }
    @PostMapping("/discount")
    public double discount(@RequestBody OrderDto dto) {
        double price = 100;
        if (dto.note.equals("VIP")) price *= 0.8;
        else if (dto.note.equals("STAFF")) price *= 0.9;
        for (int i = 0; i < 5; i++) price += i;
        return price;
    }

    // V205 direct service instantiation
    // RICA-V205 FIX:
    // Remove direct service creation and inject OrderService.
    // API resources/controllers should not choose concrete service implementations.
    // Example fixed shape:
    //   return orderService.findAll().toString();
    @GetMapping("/instantiate")
    public String instantiate() {
        com.example.bad.service.OrderService s = new com.example.bad.service.OrderService();
        return s.findAll().toString();
    }

    // V207 exposing internal structure (returns non-DTO internal type)
    // RICA-V207 FIX:
    // Do not expose service/internal objects from controller methods.
    // Return DTOs or stable API response objects only.
    // Example fixed shape:
    //   public OrderServiceStatus getServiceStatus() {
    //       return orderService.status();
    //   }
    public com.example.bad.service.OrderService getService() {
        return orderService;
    }

    public void fake() {}
}
