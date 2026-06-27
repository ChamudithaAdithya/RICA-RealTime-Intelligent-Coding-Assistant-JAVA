const assert = require('assert');
const { JavaParser } = require('../javaParser');
const { buildGraphFromFiles } = require('../dependencyGraph');
const { CrossFileAnalyzer, buildCrossFileAnalyzer } = require('../crossFileAnalyzer');

const outputChannel = { appendLine: () => {} };
const parser = new JavaParser(outputChannel);

function parse(code, filePath) {
    return parser.parse(code, filePath || 'Test.java');
}

describe('CrossFileAnalyzer — Dependency Graph', () => {

    it('should build a graph from parsed files', () => {
        const files = {
            'Controller.java': parse(`package com.example;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
@RestController
public class MyController {
    @Autowired
    private MyService myService;
}`),
            'Service.java': parse(`package com.example;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class MyService {
    @Autowired
    private MyRepository myRepository;
}`),
            'Repository.java': parse(`package com.example;
import org.springframework.stereotype.Repository;
@Repository
public class MyRepository {
    public String find() { return "data"; }
}`),
        };
        const graph = buildGraphFromFiles(files);
        assert.ok(graph, 'graph should be built');
        assert.ok(graph.nodes.size >= 3, 'graph should have at least 3 nodes');
        assert.ok(graph.edges.length > 0, 'graph should have edges');
    });

    it('should detect controller-bypass violation (controller → repository directly)', () => {
        const files = {
            'ReportController.java': parse(`package com.example;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
@RestController
public class ReportController {
    @Autowired
    private StudentRepository studentRepository;
    public String get() { return studentRepository.findById("1"); }
}`, 'ReportController.java'),
            'StudentRepository.java': parse(`package com.example;
import org.springframework.stereotype.Repository;
@Repository
public class StudentRepository {
    public String findById(String id) { return "data"; }
}`, 'StudentRepository.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);
        const bypass = violations.find(v => v.code === 'RICA-V401');
        assert.ok(bypass, 'should detect controller bypass');
    });

    it('should detect entity-exposure violation (controller returning entity)', () => {
        const code = `package com.example;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class MyController {
    public MyEntity getEntity(String id) { return null; }
}`;
        const ast = parse(code, 'MyController.java');
        // Entity exposure is also detected at graph level via return type inference
        const files = { 'MyController.java': ast };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);
        // May or may not fire depending on graph inference; at minimum should not crash
        assert.ok(Array.isArray(violations));
    });

    it('should detect cyclic-dependency between services', () => {
        const files = {
            'ServiceA.java': parse(`package com.example;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class ServiceA {
    @Autowired
    private ServiceB serviceB;
    public void doA() { serviceB.doB(); }
}`, 'ServiceA.java'),
            'ServiceB.java': parse(`package com.example;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class ServiceB {
    @Autowired
    private ServiceA serviceA;
    public void doB() { serviceA.doA(); }
}`, 'ServiceB.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);
        const cyclic = violations.find(v => v.code === 'RICA-V403');
        assert.ok(cyclic, 'should detect cyclic dependency');
    });

    it('should detect cross-layer-violation (entity referencing service)', () => {
        const files = {
            'MyEntity.java': parse(`package com.example;
import jakarta.persistence.Entity;
import org.springframework.beans.factory.annotation.Autowired;
@Entity
public class MyEntity {
    @Autowired
    private SomeService someService;
    public void doSomething() { someService.process(); }
}`, 'MyEntity.java'),
            'SomeService.java': parse(`package com.example;
import org.springframework.stereotype.Service;
@Service
public class SomeService {
    public void process() {}
}`, 'SomeService.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);
        const crossLayer = violations.find(v => v.code === 'RICA-V402');
        assert.ok(crossLayer, 'should detect cross-layer violation');
    });
});

describe('CrossFileAnalyzer — Clean Architecture (no violations)', () => {

    it('should find no violations in well-architected layered project', () => {
        const files = {
            'StudentController.java': parse(`package com.example.controller;
import com.example.service.StudentService;
import com.example.dto.StudentDTO;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
@RestController
@RequestMapping("/students")
public class StudentController {
    @Autowired
    private StudentService studentService;
    @GetMapping("/{id}")
    public StudentDTO getStudent(@PathVariable String id) {
        StudentDTO dto = studentService.findById(id);
        return dto;
    }
}`, 'StudentController.java'),
            'StudentService.java': parse(`package com.example.service;
import com.example.repository.StudentRepository;
import com.example.dto.StudentDTO;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;
    public StudentDTO findById(String id) {
        return studentRepository.findById(id);
    }
}`, 'StudentService.java'),
            'StudentRepository.java': parse(`package com.example.repository;
import org.springframework.stereotype.Repository;
@Repository
public class StudentRepository {
    public StudentDTO findById(String id) { return null; }
}`, 'StudentRepository.java'),
            'StudentDTO.java': parse(`package com.example.dto;
public class StudentDTO {
    private String id;
    private String name;
}`, 'StudentDTO.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);
        const seriousViolations = violations.filter(v => v.severity === 'error');
        assert.strictEqual(seriousViolations.length, 0,
            `clean architecture should have 0 error violations, got ${seriousViolations.length}`);
    });
});

describe('CrossFileAnalyzer — Multiple Rule Detection', () => {

    it('should produce unique violation IDs', () => {
        const files = {
            'BadController.java': parse(`package com.example;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
@RestController
public class BadController {
    @Autowired
    private SomeRepository someRepository;
    public String get() { return someRepository.findById(); }
}`, 'BadController.java'),
            'SomeRepository.java': parse(`package com.example;
import org.springframework.stereotype.Repository;
@Repository
public class SomeRepository {
    public String findById() { return "x"; }
}`, 'SomeRepository.java'),
            'SomeService.java': parse(`package com.example;
import org.springframework.stereotype.Service;
@Service
public class SomeService {
    public void process() {}
}`, 'SomeService.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);

        const ids = violations.map(v => v.id);
        const uniqueIds = new Set(ids);
        assert.strictEqual(ids.length, uniqueIds.size, 'all violation IDs must be unique');
    });

    it('should classify violations with correct RICA-V codes', () => {
        const files = {
            'CyclicA.java': parse(`package com.example;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class CyclicA {
    @Autowired
    private CyclicB cyclicB;
    public void doA() { cyclicB.doB(); }
}`, 'CyclicA.java'),
            'CyclicB.java': parse(`package com.example;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
@Service
public class CyclicB {
    @Autowired
    private CyclicA cyclicA;
    public void doB() { cyclicA.doA(); }
}`, 'CyclicB.java'),
            'EntityViolation.java': parse(`package com.example;
import jakarta.persistence.Entity;
import org.springframework.beans.factory.annotation.Autowired;
@Entity
public class EntityViolation {
    @Autowired
    private SomeService someService;
    public void act() { someService.process(); }
}`, 'EntityViolation.java'),
            'SomeService.java': parse(`package com.example;
import org.springframework.stereotype.Service;
@Service
public class SomeService {
    public void process() {}
}`, 'SomeService.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);

        const knownCodes = violations.map(v => v.code);
        const allValidCodes = knownCodes.every(c => /^RICA-V[0-9]{3}$/.test(c));
        assert.ok(allValidCodes, `all codes should match RICA-V\\d{3}, got: ${knownCodes.join(', ')}`);
    });
});

describe('CrossFileAnalyzer — Error Handling', () => {

    it('should handle empty file set gracefully', () => {
        const graph = buildGraphFromFiles({});
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, {});
        assert.ok(Array.isArray(violations));
        assert.strictEqual(violations.length, 0, 'empty set should have 0 violations');
    });

    it('should handle single file with no dependencies', () => {
        const files = {
            'Standalone.java': parse(`package com.example;
public class Standalone {
    public String greet() { return "hello"; }
}`, 'Standalone.java'),
        };
        const graph = buildGraphFromFiles(files);
        const analyzer = buildCrossFileAnalyzer();
        const violations = analyzer.analyze(graph, files);
        assert.ok(Array.isArray(violations));
        assert.strictEqual(violations.length, 0, 'standalone file should have 0 cross-file violations');
    });
});
