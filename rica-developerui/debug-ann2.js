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
        Object x = new String("hi");
        System.out.println(x);
    }
}`;
const cst = java_parser_1.default.parse(code);
// Debug: show full root structure
console.log('=== Root CST Structure ===');
function showCST(node, depth = 0) {
    if (!node || depth > 10)
        return;
    const indent = '  '.repeat(depth);
    const name = node.name || '(unnamed)';
    const image = node.image || '';
    if (depth > 0 && !image) {
        console.log(`${indent}${name}`);
    }
    if (node.children) {
        for (const key of Object.keys(node.children)) {
            const val = node.children[key];
            if (Array.isArray(val)) {
                console.log(`${indent}  ${key}: [${val.length}]`);
                for (let i = 0; i < Math.min(val.length, 2); i++) {
                    const c = val[i];
                    if (c.children)
                        showCST(c, depth + 2);
                    else if (c.image)
                        console.log(`${indent}    [${i}] ${c.image}`);
                    else
                        console.log(`${indent}    [${i}] (leaf)`);
                }
                if (val.length > 2)
                    console.log(`${indent}    ... (${val.length - 2} more)`);
            }
            else {
                console.log(`${indent}  ${key}: (scalar)`);
                if (val.children)
                    showCST(val, depth + 1);
            }
        }
    }
}
// Show compilation unit level
const cu = cst.children?.compilationUnit?.[0];
if (cu) {
    console.log('\n=== compilationUnit ===');
    console.log('children:', Object.keys(cu.children));
    for (const key of Object.keys(cu.children)) {
        const val = cu.children[key];
        console.log(`  ${key}: ${Array.isArray(val) ? val.length + ' items' : typeof val}`);
    }
    // Check importDeclarations
    const imports = cu.children?.importDeclarations || [];
    console.log(`\n=== importDeclarations: ${imports.length} ===`);
    for (let i = 0; i < imports.length; i++) {
        const imp = imports[i];
        console.log(`[${i}] name: ${imp.name}`);
        if (imp.children) {
            console.log(`  children: ${Object.keys(imp.children).join(', ')}`);
            // Check packageOrTypeName
            const ptn = imp.children?.packageOrTypeName?.[0];
            if (ptn) {
                console.log(`  packageOrTypeName children: ${ptn.children ? Object.keys(ptn.children).join(', ') : 'none'}`);
                if (ptn.children?.Identifier) {
                    console.log(`  Identifiers: ${ptn.children.Identifier.map((id) => id.image).join('.')}`);
                }
            }
        }
    }
    // Check typeDeclarations
    const types = cu.children?.typeDeclarations || [];
    console.log(`\n=== typeDeclarations: ${types.length} ===`);
    for (let i = 0; i < types.length; i++) {
        const td = types[i];
        console.log(`[${i}] name: ${td.name}`);
        if (td.children) {
            console.log(`  children: ${Object.keys(td.children).join(', ')}`);
            // Check classDeclaration
            const cd = td.children?.classDeclaration?.[0];
            if (cd) {
                console.log(`  classDeclaration children: ${Object.keys(cd.children).join(', ')}`);
                // Check normalClassDeclaration
                const ncd = cd.children?.normalClassDeclaration?.[0];
                if (ncd) {
                    console.log(`  normalClassDeclaration children: ${Object.keys(ncd.children).join(', ')}`);
                }
                // Check modifiers on classDeclaration
                for (const key of Object.keys(cd.children)) {
                    console.log(`  cd.${key}: ${Array.isArray(cd.children[key]) ? cd.children[key].length + ' items' : typeof cd.children[key]}`);
                }
            }
        }
    }
}
// Debug: find what contains @Service annotation
function findAnnotationContext(node) {
    if (!node)
        return;
    if (node.name === 'annotation' || (node.children?.annotationName)) {
        const annName = node.children?.annotationName?.[0];
        const name = annName ? (annName.children?.Identifier?.[0]?.image || '?') : '?';
        if (name === 'Service' || name === 'Autowired') {
            console.log(`\nFound @${name} annotation`);
            // Work backwards to find its context
            console.log(`  Node children: ${Object.keys(node.children || {}).join(', ')}`);
        }
    }
    if (node.children) {
        for (const key of Object.keys(node.children)) {
            if (Array.isArray(node.children[key])) {
                for (const child of node.children[key]) {
                    findAnnotationContext(child);
                }
            }
        }
    }
}
findAnnotationContext(cst);
