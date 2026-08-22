package com.example.structural.application;

import java.util.HashMap;
import java.util.Map;

public class MutableRegistry {
    // V305 mutable singleton — static non-final mutable
    public static Map<String,String> config = new HashMap<>();
}
