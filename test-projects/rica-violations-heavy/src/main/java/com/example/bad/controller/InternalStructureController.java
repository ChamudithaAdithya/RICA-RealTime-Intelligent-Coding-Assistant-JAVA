package com.example.bad.controller;

import com.example.bad.shared.InternalInvoice;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InternalStructureController {
    @GetMapping("/invoice")
    public InternalInvoice invoice() {
        return new InternalInvoice();
    }
}
