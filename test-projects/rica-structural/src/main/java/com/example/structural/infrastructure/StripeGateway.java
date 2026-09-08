package com.example.structural.infrastructure;
import com.example.structural.domain.PaymentGateway;

// RICA-V307 FIX:
// Keep an interface only when it has real substitution value or multiple clients/implementations.
// If there is only one permanent implementation, consider simplifying the abstraction.
// Example fixed shape:
//   use StripeGateway directly when no alternate gateway is expected,
// or keep PaymentGateway when tests/adapters genuinely substitute it.
public class StripeGateway implements PaymentGateway { public void charge(double a){} } // V307 only impl
