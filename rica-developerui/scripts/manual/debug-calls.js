const javaParser = require('java-parser');

const code = `package com.example.school;

public class Foo {
    private String repo;
    public Foo(String repo) { this.repo = repo; }
    public void bar() {
        String x = repo.find("test");
        System.out.println(x);
    }
}`;

const cst = javaParser.parse(code);
const cu = cst.children.ordinaryCompilationUnit[0];
const td = cu.children.typeDeclaration[0];
const cd = td.children.classDeclaration[0];
const ncd = cd.children.normalClassDeclaration[0];
const cb = ncd.children.classBody[0];

for (const cbd of cb.children.classBodyDeclaration) {
    // Constructor
    if (cbd.children && cbd.children.constructorDeclaration) {
        const ctor = cbd.children.constructorDeclaration[0];
        const body = ctor.children.constructorBody[0];
        const bs = body.children.blockStatements ? body.children.blockStatements[0] : null;
        if (bs && bs.children && bs.children.blockStatement) {
            for (const stmt of bs.children.blockStatement) {
                console.log('\n=== Constructor statement ===');
                printNode(stmt, 0);
            }
        }
    }
    
    // Method
    if (cbd.children && cbd.children.classMemberDeclaration) {
        const cmd = cbd.children.classMemberDeclaration[0];
        if (cmd.children && cmd.children.methodDeclaration) {
            const md = cmd.children.methodDeclaration[0];
            const body = md.children.methodBody ? md.children.methodBody[0] : null;
            if (body) {
                console.log('\n=== methodBody children:', Object.keys(body.children));
                const block = body.children.block ? body.children.block[0] : null;
                if (block) {
                    console.log('block children:', Object.keys(block.children));
                    const bss = block.children.blockStatements ? block.children.blockStatements[0] : null;
                    if (bss && bss.children && bss.children.blockStatement) {
                        for (const stmt of bss.children.blockStatement) {
                            console.log('\n=== Method statement ===');
                            printNode(stmt, 0);
                        }
                    }
                }
            }
        }
    }
}

// Check formal parameter structure
console.log('\n=== Checking formal parameter ===');
for (const cbd of cb.children.classBodyDeclaration) {
    if (cbd.children && cbd.children.constructorDeclaration) {
        const ctor = cbd.children.constructorDeclaration[0];
        const decl = ctor.children.constructorDeclarator[0];
        console.log('constructorDeclarator keys:', Object.keys(decl.children));
        const fpl = decl.children.formalParameterList ? decl.children.formalParameterList[0] : null;
        if (fpl && fpl.children && fpl.children.formalParameter) {
            for (const fp of fpl.children.formalParameter) {
                console.log('formalParameter keys:', Object.keys(fp.children));
                if (fp.children.variableDeclaratorId) {
                    const vdi = fp.children.variableDeclaratorId[0];
                    console.log('  variableDeclaratorId keys:', vdi.children ? Object.keys(vdi.children) : 'none');
                    if (vdi.children && vdi.children.Identifier) {
                        console.log('  Identifier:', vdi.children.Identifier[0].image);
                    }
                }
                if (fp.children.unannType) {
                    const ut = fp.children.unannType[0];
                    console.log('  unannType keys:', Object.keys(ut.children));
                }
            }
        }
    }
}

function printNode(node, indent) {
    if (!node) return;
    const prefix = '  '.repeat(indent);
    if (node.name) {
        console.log(prefix + node.name + (node.image ? ' = ' + node.image : ''));
    }
    if (node.children) {
        for (const key of Object.keys(node.children)) {
            const val = node.children[key];
            if (Array.isArray(val)) {
                console.log(prefix + '  ' + key + ':');
                for (const child of val) {
                    printNode(child, indent + 2);
                }
            }
        }
    }
}
