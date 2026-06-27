"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const javaParser_1 = require("./src/javaParser");
const outputChannel = {
    appendLine: (msg) => console.log('[OUT]', msg)
};
const parser = new javaParser_1.JavaParser(outputChannel);
const sampleCode = `package com.example.school;

import org.springframework.stereotype.Service;
import jakarta.persistence.Entity;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;
import java.sql.SQLException;

@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;
    private AuditService auditService;

    public StudentService(StudentRepository studentRepository, AuditService auditService) {
        this.studentRepository = studentRepository;
        this.auditService = auditService;
    }

    public Student findStudent(String id) throws SQLException {
        if (id == null || id.isEmpty()) {
            throw new IllegalArgumentException("ID must not be empty");
        }
        Student student = studentRepository.findById(id);
        if (student != null) {
            auditService.logAccess(id);
            return student;
        }
        return null;
    }

    public void processGrades(List<Integer> grades) {
        int total = 0;
        for (int i = 0; i < grades.size(); i++) {
            total += grades.get(i);
        }
        double avg = total / grades.size();
        if (avg >= 50.0) {
            System.out.println("Pass");
        } else {
            System.out.println("Fail");
        }
    }
}`;
try {
    const ast = parser.parse(sampleCode, 'StudentService.java');
    const cls = ast.classes[0];
    console.log('=== CLASS INFO ===');
    console.log('className:', cls.className);
    console.log('detectedLayer:', cls.detectedLayer);
    console.log('layerClassification:', JSON.stringify(cls.layerClassification, null, 2));
    console.log('injectionStrategy:', cls.injectionStrategy);
    console.log();
    console.log('=== ATTRIBUTES ===');
    for (const attr of cls.attributes) {
        console.log(`  ${attr.name}: ${attr.dataType}, isInjected=${attr.isInjected}, injectionType=${attr.injectionType}`);
    }
    console.log();
    console.log('=== CONSTRUCTORS ===');
    for (const ctor of cls.constructors) {
        console.log(`  ${ctor.name}(${ctor.parameters.map(p => p.name + ':' + p.dataType).join(', ')})`);
        console.log('  accessedFields:', ctor.accessedFields);
        console.log('  injectionAssignments:', JSON.stringify(ctor.injectionAssignments));
    }
    console.log();
    console.log('=== METHODS ===');
    for (const method of cls.methods) {
        console.log(`  ${method.name}():`);
        if (method.complexityMetrics) {
            console.log(`    complexity: ${method.complexityMetrics.cyclomaticComplexity}, maxDepth: ${method.complexityMetrics.maxNestingDepth}`);
            console.log(`    decisionPoints: ${JSON.stringify(method.complexityMetrics.decisionPoints)}`);
        }
        console.log(`    calledMethods:`);
        for (const call of method.calledMethods) {
            console.log(`      ${call.calledMethodName}() on ${call.receiverVariableName} (${call.receiverType}) args: [${call.arguments.join(', ')}] line:${call.lineNumber}`);
        }
        if (method.accessedFields && method.accessedFields.length > 0) {
            console.log(`    accessedFields:`, method.accessedFields);
        }
        console.log(`    businessLogicScore: ${method.body?.businessLogicScore}`);
        console.log(`    linesOfCode: ${method.body?.linesOfCode}`);
    }
    console.log();
    console.log('=== RELATIONSHIPS ===');
    for (const rel of ast.relationships) {
        console.log(`  ${rel.sourceId} --[${rel.type}]--> ${rel.targetId}`, rel.metadata ? JSON.stringify(rel.metadata) : '');
    }
    console.log();
    console.log('=== IMPORTS ===');
    for (const imp of ast.imports) {
        console.log(`  ${imp.qualifiedName} (line ${imp.line})`);
    }
}
catch (error) {
    console.error('Error:', error);
}
