package com.example.structural.domain;

// V309 fat interface - 12 methods
// RICA-V309 FIX:
// Split the interface by client needs when callers use only a small subset.
// Clients should depend on focused interfaces instead of one broad contract.
// Example fixed shape:
//   interface ReaderActions { void a(); void b(); }
//   interface WriterActions { void c(); void d(); }
public interface FatInterface {
    void a(); void b(); void c(); void d(); void e(); void f(); void g(); void h(); void i(); void j(); void k(); void l();
}
