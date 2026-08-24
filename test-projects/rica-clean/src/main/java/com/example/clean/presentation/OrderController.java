package com.example.clean.presentation;

import com.example.clean.application.OrderService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
public class OrderController {
    private final OrderService orderService;
    public OrderController(OrderService orderService) { this.orderService = orderService; }

    // Thin controller — no business logic (V106 safe), no HTTP client/file IO (V110/V111 safe)
    @PostMapping("/place")
    public OrderResponse place(@Valid @RequestBody OrderRequest request) {
        orderService.placeOrder(request.getOrderId(), request.getDiscount());
        return new OrderResponse(request.getOrderId(), "PLACED");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST)
    private String handleBadRequest(IllegalArgumentException e) { return e.getMessage(); }
}
