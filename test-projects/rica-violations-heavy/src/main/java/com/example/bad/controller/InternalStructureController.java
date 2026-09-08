package com.example.bad.controller;

import com.example.bad.shared.InternalInvoice;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InternalStructureController {
    // RICA-V207 FIX:
    // Return a public API DTO instead of an internal/shared implementation type.
    // Keep internal model classes behind the service/API boundary.
    // Example fixed shape:
    //   public InvoiceResponse invoice() {
    //       return invoiceService.findInvoiceResponse();
    //   }
    @GetMapping("/invoice")
    public InternalInvoice invoice() {
        return new InternalInvoice();
    }
}
