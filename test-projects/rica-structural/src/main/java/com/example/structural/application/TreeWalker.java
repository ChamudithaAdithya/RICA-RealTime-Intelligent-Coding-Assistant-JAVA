package com.example.structural.application;

import java.util.List;

public class TreeWalker {
    List<Object> nodes;
    // V314 composite — loop + 2 instanceof
    // RICA-V314 FIX:
    // Introduce a Component interface shared by folders and file items.
    // Iterate over the abstraction instead of branching on concrete node types.
    // Example fixed shape:
    //   interface Node { void accept(TreeVisitor visitor); }
    //   for (Node child : folder.children()) child.accept(visitor);
    public void walk(Object node){
        for(Object child: nodes){
            if(node instanceof Folder){
                if(child instanceof FileItem){ System.out.println(child); }
            }
        }
    }
    static class Folder{} static class FileItem{}
}
