package com.example.structural.bridge;

// V323 subclass explosion
// RICA-V323 FIX:
// Split shape type and color/rendering into two independent abstractions.
// Use Bridge composition instead of creating every color-shape subclass.
// Example fixed shape:
//   abstract class Shape { protected Color color; abstract void draw(); }
//   class Circle extends Shape { Circle(Color color) { this.color = color; } }
public abstract class Shape {
    abstract void draw();
}
