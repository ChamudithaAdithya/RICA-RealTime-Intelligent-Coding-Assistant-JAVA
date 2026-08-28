package com.example.clean.presentation;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public class OrderRequest {
    @NotNull @Positive private Long orderId;
    @NotNull private BigDecimal discount;
    public Long getOrderId(){ return orderId; }
    public BigDecimal getDiscount(){ return discount; }
}
