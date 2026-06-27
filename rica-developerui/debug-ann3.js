const javaParser = require('java-parser');

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

const cst = javaParser.parse(code);
const cu = cst.children.compilationUnit[0];

console.log('=== compilationUnit children ===');
console.log(Object.keys(cu.children).join(', '));

for (const key of Object.keys(cu.children)) {
    const val = cu.children[key];
    console.log(`\n${key}: ${Array.isArray(val) ? val.length + ' items' : typeof val}`);
    if (Array.isArray(val) && val.length > 0 && val[0].name) {
        console.log(`  [0] name=${val[0].name}`);
        if (val[0].children) {
            const ckeys = Object.keys(val[0].children);
            console.log(`  children: ${ckeys.join(', ')}`);
            // Show deeper
            for (const ck of ckeys) {
                const cv = val[0].children[ck];
                if (Array.isArray(cv)) {
                    console.log(`    ${ck}: ${cv.length} items`);
                    if (cv.length > 0 && cv[0].name) {
                        console.log(`      [0] name=${cv[0].name}, image=${cv[0].image || ''}`);
                        if (cv[0].children) {
                            console.log(`      sub-children: ${Object.keys(cv[0].children).join(', ')}`);
                        }
                    }
                } else if (cv && cv.name) {
                    console.log(`    ${ck}: name=${cv.name}`);
                } else if (cv && cv.image) {
                    console.log(`    ${ck}: image=${cv.image}`);
                }
            }
        }
    }
}
