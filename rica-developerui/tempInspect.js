const JavaParser = require("./src/javaParser").JavaParser;
const out = { appendLine: console.log };
const p = new JavaParser(out);
const sample = `package com.example.school;

public class Student {
    public String getName() {
        return name;
    }
}`;
const cst = p.parser.parse(sample);
const md = cst.children.ordinaryCompilationUnit[0].children.typeDeclaration[0].children.classDeclaration[0].children.normalClassDeclaration[0].children.classBody[0].children.classBodyDeclaration[0].children.classMemberDeclaration[0].children.methodDeclaration[0];
const mb = md.children.methodBody[0];
console.log('methodBody children keys:', Object.keys(mb.children || {}));
const block = mb.children.block[0];
console.log('block keys:', Object.keys(block || {}));
console.log('block children keys:', Object.keys(block.children || {}));
console.log('block JSON:', JSON.stringify(block.children, null, 2));
