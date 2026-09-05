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

console.log('Root keys:', Object.keys(cst));
console.log('Root children keys:', cst.children ? Object.keys(cst.children) : 'no children');

for (const key of Object.keys(cst.children || {})) {
    const val = cst.children[key];
    console.log(`\n${key}: ${Array.isArray(val) ? val.length + ' items' : typeof val}`);
    if (Array.isArray(val)) {
        for (let i = 0; i < Math.min(val.length, 3); i++) {
            const v = val[i];
            console.log(`  [${i}] name=${v.name || '(unnamed)'}, image=${v.image || ''}`);
            if (v.children) {
                console.log(`    children: ${Object.keys(v.children).join(', ')}`);
                for (const ck of Object.keys(v.children)) {
                    const cv = v.children[ck];
                    console.log(`      ${ck}: ${Array.isArray(cv) ? cv.length + ' items' : typeof cv}`);
                    if (Array.isArray(cv) && cv.length > 0 && cv[0].name) {
                        console.log(`        [0] name=${cv[0].name}, image=${cv[0].image || ''}`);
                        if (cv[0].children) {
                            console.log(`        sub-children: ${Object.keys(cv[0].children).join(', ')}`);
                        }
                    }
                }
            }
        }
    }
}
