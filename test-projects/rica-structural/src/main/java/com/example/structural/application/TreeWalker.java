package com.example.structural.application;

import java.util.List;

public class TreeWalker {
    List<Object> nodes;
    // V314 composite — loop + 2 instanceof
    public void walk(Object node){
        for(Object child: nodes){
            if(node instanceof Folder){
                if(child instanceof FileItem){ System.out.println(child); }
            }
        }
    }
    static class Folder{} static class FileItem{}
}
