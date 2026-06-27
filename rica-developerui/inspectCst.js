const parser = require('./src/javaParser.js').JavaParser;
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

const p = new parser({ appendLine: () => {} });
const cst = p.parser.parse(source);
const decls = cst.children.ordinaryCompilationUnit[0].children.typeDeclaration[0].children.classDeclaration[0].children.normalClassDeclaration[0].children.classBody[0].children.classBodyDeclaration;
decls.forEach((d,i)=>{
  const keys= Object.keys(d.children);
  if (keys.includes('classMemberDeclaration') && d.children.classMemberDeclaration[0].children.methodDeclaration) {
    console.log('method decl found at', i, Object.keys(d.children.classMemberDeclaration[0].children));
    const md = d.children.classMemberDeclaration[0].children.methodDeclaration[0];
    console.log('methodDeclaration keys', Object.keys(md.children));
    console.log('methodBody keys', Object.keys(md.children.methodBody[0].children));
    const body = md.children.methodBody[0];
    console.log('body JSON', JSON.stringify(body, null, 2));
    if (p.getBlockStatements) {
      const block = body.children?.block?.[0];
      console.log('block exists', !!block);
      console.log('block children keys', block ? Object.keys(block.children) : 'none');
      console.log('blockStatements count', block?.children?.blockStatements?.[0]?.children?.blockStatement?.length);
      console.log('getBlockStatements count', p.getBlockStatements(block).length);
      console.log('getBlockStatements items', JSON.stringify(p.getBlockStatements(block), null, 2));
    }
  }
});
