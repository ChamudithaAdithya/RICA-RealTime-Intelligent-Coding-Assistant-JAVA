const JavaParser = require('./src/javaParser.js').JavaParser;
const source = `package com.example.school;

public class Student {
    private static int count = 0;
    private final String university = "ABC University";
    public String name = "John";
    protected int age;

    public Student(String name) {
        this.name = name;
        count++;
    }

    public String getName() {
        return name;
    }
}`;
const p = new JavaParser({ appendLine: () => {} });
const cst = p.parser.parse(source);
const cls = cst.children.ordinaryCompilationUnit[0].children.typeDeclaration[0].children.classDeclaration[0].children.normalClassDeclaration[0];
const decls = cls.children.classBody[0].children.classBodyDeclaration;
const mdDecl = decls.find(d => d.children.classMemberDeclaration && d.children.classMemberDeclaration[0].children.methodDeclaration);
const md = mdDecl.children.classMemberDeclaration[0].children.methodDeclaration[0];
const body = md.children.methodBody[0];
const block = body.children.block[0];
console.log('blockStatementsExists', Array.isArray(block.children.blockStatements));
console.log('blockStatementsLength', block.children.blockStatements[0].children.blockStatement.length);
console.log('helperLength', p.getBlockStatements(block).length);
console.log('helperFirst', p.getBlockStatements(block)[0]?.name);
console.log('body', JSON.stringify(body, null, 2));
