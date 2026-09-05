// ladder test: o == null, o.user == null, o.user.name == null
const {JavaParser}=require('../../dist/infrastructure/javaParser');
const {DesignPatternAnalyzer}=require('../../dist/analyzers/designPatternAnalyzer');
const p=new JavaParser({appendLine:()=>{}});
const code = `package com.example;
class OrderService {
    public String render(Order o) {
        if (o == null) return "";
        if (o.user == null) return "";
        if (o.user.name == null) return "";
        return o.user.name;
    }
}`;
let ast=p.parse(code,'T.java');
let m=ast.classes[0].methods[0];
for(let d of m.complexityMetrics.decisionPoints){
  console.log(JSON.stringify(d.condition), '=> target:', new DesignPatternAnalyzer()['nullCheckTarget'](d.condition));
}
