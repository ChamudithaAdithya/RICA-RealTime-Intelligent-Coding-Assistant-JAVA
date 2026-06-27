const javaParser = require('java-parser');

const code = `package com.example.school;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class StudentService {
    @Autowired
    private String name;
    public StudentService(String name) { this.name = name; }
    public void foo() { System.out.println("hi"); }
}`;

const cst = javaParser.parse(code);
const cu = cst.children.ordinaryCompilationUnit[0];

// Check typeDeclaration -> classDeclaration
const td = cu.children.typeDeclaration[0];
console.log('typeDeclaration children:', Object.keys(td.children));
const cd = td.children.classDeclaration[0];
console.log('\nclassDeclaration children:', Object.keys(cd.children));
for (const key of Object.keys(cd.children)) {
    const val = cd.children[key];
    console.log(`  ${key}: ${Array.isArray(val) ? val.length + ' items' : typeof val}`);
    if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
            const v = val[i];
            console.log(`    [${i}] name=${v.name || '(unnamed)'}, image=${v.image || ''}`);
            if (v.children) {
                console.log(`      children: ${Object.keys(v.children).join(', ')}`);
                for (const ck of Object.keys(v.children)) {
                    const cv = v.children[ck];
                    console.log(`        ${ck}: ${Array.isArray(cv) ? cv.length + ' items' : typeof cv}`);
                    if (Array.isArray(cv) && cv.length > 0 && cv[0].name) {
                        console.log(`          [0] name=${cv[0].name}`);
                        if (cv[0].children) {
                            const ckeys = Object.keys(cv[0].children);
                            console.log(`          sub: ${ckeys.join(', ')}`);
                            // Go one more level for annotations
                            for (const ck2 of ckeys) {
                                const cv2 = cv[0].children[ck2];
                                if (Array.isArray(cv2) && cv2.length > 0 && cv2[0].children) {
                                    console.log(`            ${ck2}[0] children: ${Object.keys(cv2[0].children).join(', ')}`);
                                    if (cv2[0].children.annotation) {
                                        console.log(`            FOUND ANNOTATION!`);
                                        for (const ann of cv2[0].children.annotation) {
                                            if (ann.children?.annotationName) {
                                                const name = ann.children.annotationName[0];
                                                console.log(`              Annotation: ${name.children?.Identifier?.[0]?.image || '?'}`);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
