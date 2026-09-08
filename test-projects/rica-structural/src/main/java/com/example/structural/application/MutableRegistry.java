package com.example.structural.application;

import java.util.HashMap;
import java.util.Map;

public class MutableRegistry {
    // V305 mutable singleton - static non-final mutable
    // RICA-V305 FIX:
    // Move mutable global state into a managed configuration/cache service.
    // Prefer immutable configuration or injected state over public static maps.
    // Example fixed shape:
    //   private final ConfigService configService;
    //   String value = configService.get("key");
    public static Map<String, String> config = new HashMap<>();
}
