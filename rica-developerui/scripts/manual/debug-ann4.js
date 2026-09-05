const javaParser = require('java-parser');

const code = `package com.example.school;
import org.springframework.stereotype.Service;

@Service
public class StudentService {
    @Autowired
    private String name;
    public StudentService(String name) { this.name = name; }
    public void foo() { System.out.println("hi"); }
}`;

const cst = javaParser.parse(code);
const cu = cst.children.ordinaryCompilationUnit[0];
const td = cu.children.typeDeclaration[0];
const cd = td.children.classDeclaration[0];

console.log('classModifier count:', cd.children.classModifier.length);
for (let i = 0; i < cd.children.classModifier.length; i++) {
    const cm = cd.children.classModifier[i];
    console.log('\n[' + i + '] classModifier children:', Object.keys(cm.children));
    for (const key of Object.keys(cm.children)) {
        const val = cm.children[key];
        if (Array.isArray(val)) {
            console.log('  ' + key + ': ' + val.length + ' items');
            for (let j = 0; j < val.length; j++) {
                const v = val[j];
                if (v.children) {
                    console.log('    [' + j + '] children:', Object.keys(v.children));
                    if (v.children.typeName) {
                        const tn = v.children.typeName[0];
                        if (tn && tn.children && tn.children.Identifier) {
                            const names = tn.children.Identifier.map(function(id) { return id.image; });
                            console.log('      typeName: ' + names.join('.'));
                        }
                    }
                }
                if (v.image) {
                    console.log('    [' + j + '] image:', v.image);
                }
            }
        } else {
            console.log('  ' + key + ': ' + typeof val);
        }
    }
}

// Check constructor body for this.field = param
const ncd = cd.children.normalClassDeclaration[0];
const cb = ncd.children.classBody[0];
for (const cbd of cb.children.classBodyDeclaration) {
    if (cbd.children && cbd.children.constructorDeclaration) {
        const ctorDecl = cbd.children.constructorDeclaration[0];
        const ctorBody = ctorDecl.children.constructorBody[0];
        console.log('\nconstructorBody children:', Object.keys(ctorBody.children));
        const bs = ctorBody.children.blockStatements ? ctorBody.children.blockStatements[0] : null;
        if (bs && bs.children && bs.children.blockStatement) {
            for (const stmt of bs.children.blockStatement) {
                if (stmt.children && stmt.children.statement) {
                    const statement = stmt.children.statement[0];
                    if (statement.children && statement.children.expression) {
                        const expression = statement.children.expression[0];
                        if (expression && expression.name === 'assignment') {
                            console.log('\nassignment!');
                            console.log('  children:', Object.keys(expression.children));
                            const lhs = expression.children.leftHandSide ? expression.children.leftHandSide[0] : null;
                            const rhs = expression.children.expression ? expression.children.expression[0] : null;
                            if (lhs) {
                                console.log('  LHS name:', lhs.name);
                                console.log('  LHS children:', lhs.children ? Object.keys(lhs.children) : 'none');
                                if (lhs.children && lhs.children.Identifier) {
                                    console.log('  LHS Identifier:', lhs.children.Identifier[0].image);
                                }
                            }
                            if (rhs) {
                                console.log('  RHS name:', rhs.name);
                                if (rhs.image) console.log('  RHS image:', rhs.image);
                                if (rhs.children && rhs.children.Identifier) {
                                    console.log('  RHS Identifier:', rhs.children.Identifier[0].image);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
