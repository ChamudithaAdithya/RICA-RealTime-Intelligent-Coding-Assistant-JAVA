const JavaParser = require('../../dist/javaParser.js').JavaParser;
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
decls.forEach((d,i)=>{
  const keys = Object.keys(d.children);
  if (d.children.classMemberDeclaration) {
    const cmd = d.children.classMemberDeclaration[0];
    console.log('decl',i,'cmd keys',Object.keys(cmd.children));
    if (cmd.children.constructorDeclaration) {
      console.log('constructorDeclaration keys', Object.keys(cmd.children.constructorDeclaration[0].children));
      const ctor = cmd.children.constructorDeclaration[0];
      if (ctor.children.constructorDeclarator) {
        console.log('constructorDeclarator keys', Object.keys(ctor.children.constructorDeclarator[0].children));
        if (ctor.children.constructorDeclarator[0].children.simpleTypeName) {
          console.log('simpleTypeName',ctor.children.constructorDeclarator[0].children.simpleTypeName[0].children.Identifier[0].image);
        }
      }
      console.log('constructorBody keys', ctor.children.constructorBody ? Object.keys(ctor.children.constructorBody[0].children) : 'no body');
    }
  }
});
