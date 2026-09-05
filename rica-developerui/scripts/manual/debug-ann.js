"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const java_parser_1 = __importDefault(require("java-parser"));
const code = `package com.example.school;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class StudentService {
    @Autowired
    private String name;
    
    public StudentService(String name) {
        this.name = name;
    }

    public void foo() {
        System.out.println("hi");
        this.name = "bar";
    }
}`;
const cst = java_parser_1.default.parse(code);
function findServiceClass(node, depth = 0) {
    if (!node)
        return;
    if (node.name === 'normalClassDeclaration') {
        console.log('=== normalClassDeclaration ===');
        console.log('Children keys:', Object.keys(node.children));
        for (const key of Object.keys(node.children)) {
            const val = node.children[key];
            const count = Array.isArray(val) ? val.length : 'scalar';
            console.log(`  ${key}: ${count}`);
            if (Array.isArray(val)) {
                for (let i = 0; i < Math.min(val.length, 5); i++) {
                    const c = val[i];
                    console.log(`    [${i}] name=${c.name}, children keys=${c.children ? Object.keys(c.children).join(',') : 'none'}`);
                    if (c.children) {
                        for (const ck of Object.keys(c.children)) {
                            console.log(`       ${ck}: ${Array.isArray(c.children[ck]) ? c.children[ck].length + ' items' : typeof c.children[ck]}`);
                        }
                    }
                }
            }
        }
        return;
    }
    if (node.children) {
        for (const key of Object.keys(node.children)) {
            if (Array.isArray(node.children[key])) {
                for (const child of node.children[key]) {
                    findServiceClass(child, depth + 1);
                }
            }
        }
    }
}
console.log('=== Search Class ===');
findServiceClass(cst);
// Also find import declarations
function findImports(node) {
    if (!node)
        return;
    if (node.name === 'importDeclaration') {
        console.log('\n=== importDeclaration ===');
        console.log('Children keys:', Object.keys(node.children));
        for (const key of Object.keys(node.children)) {
            console.log(`  ${key}: ${Array.isArray(node.children[key]) ? node.children[key].length + ' items' : typeof node.children[key]}`);
        }
        return;
    }
    if (node.children) {
        for (const key of Object.keys(node.children)) {
            if (Array.isArray(node.children[key])) {
                for (const child of node.children[key]) {
                    findImports(child);
                }
            }
        }
    }
}
findImports(cst);
