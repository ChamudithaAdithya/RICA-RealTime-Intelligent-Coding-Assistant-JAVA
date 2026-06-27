import { JavaParser } from './src/javaParser';
import { analyzeProject, formatReport } from './src/projectAnalyzer';

const outputChannel = {
    appendLine: (msg: string) => console.log('[OUT]', msg)
} as any;

const parser = new JavaParser(outputChannel);

// Simulate a multi-file Spring Boot project
const files: Record<string, { path: string; code: string }> = {
    'StudentController.java': {
        path: 'src/main/java/com/example/school/controller/StudentController.java',
        code: `package com.example.school.controller;

import com.example.school.service.StudentService;
import com.example.school.entity.StudentEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/students")
public class StudentController {
    @Autowired
    private StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/{id}")
    public StudentEntity getStudent(String id) {
        return studentService.findById(id);
    }

    @GetMapping
    public List<StudentEntity> getAllStudents() {
        return studentService.findAll();
    }
}`
    },
    'StudentService.java': {
        path: 'src/main/java/com/example/school/service/StudentService.java',
        code: `package com.example.school.service;

import com.example.school.repository.StudentRepository;
import com.example.school.entity.StudentEntity;
import com.example.school.controller.StudentController;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;

    public StudentEntity findById(String id) {
        return studentRepository.findById(id);
    }

    public List<StudentEntity> findAll() {
        return studentRepository.findAll();
    }

    // VIOLATION: Service depending on Controller
    public void registerWithController(StudentController ctrl) {
        // should not depend on controller
    }
}`
    },
    'StudentRepository.java': {
        path: 'src/main/java/com/example/school/repository/StudentRepository.java',
        code: `package com.example.school.repository;

import com.example.school.entity.StudentEntity;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class StudentRepository {
    public StudentEntity findById(String id) {
        return new StudentEntity();
    }

    public List<StudentEntity> findAll() {
        return List.of();
    }
}`
    },
    'StudentEntity.java': {
        path: 'src/main/java/com/example/school/entity/StudentEntity.java',
        code: `package com.example.school.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class StudentEntity {
    @Id
    private String id;
    private String name;
    private String email;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}`
    },
    // VIOLATION: Controller directly using repository
    'ReportController.java': {
        path: 'src/main/java/com/example/school/controller/ReportController.java',
        code: `package com.example.school.controller;

import com.example.school.repository.StudentRepository;
import com.example.school.entity.StudentEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reports")
public class ReportController {
    @Autowired
    private StudentRepository studentRepository;

    // VIOLATION: Controller directly calls repository, skipping service layer
    @GetMapping("/direct")
    public StudentEntity directDbAccess(String id) {
        return studentRepository.findById(id);
    }
}`
    }
};

async function main() {
    const parsedFiles: Record<string, any> = {};

    for (const [name, file] of Object.entries(files)) {
        try {
            const ast = parser.parse(file.code, file.path);
            parsedFiles[name] = ast;
            console.log(`[OK] Parsed ${name} — ${ast.classes.length} class(es), ${ast.relationships.length} relationship(s)`);
        } catch (e: any) {
            console.error(`[FAIL] Error parsing ${name}: ${e.message}`);
        }
    }

    if (Object.keys(parsedFiles).length === 0) {
        console.error('No files parsed successfully');
        return;
    }

    // Build project output
    const projectOutput = {
        projectName: 'school-management',
        workspacePath: 'src/main/java',
        timestamp: Date.now(),
        files: parsedFiles,
        relationships: [] as any[],
        totalFiles: Object.keys(parsedFiles).length
    };

    const report = analyzeProject(projectOutput);
    console.log('\n' + formatReport(report));

    // Detailed graph dump
    console.log('\n=== GRAPH NODES ===');
    for (const [id, node] of report.graph.nodes) {
        console.log(`  ${id} (${node.type}) layer=${node.metadata.layer || '?'} file=${node.metadata.filePath.split('/').pop()}`);
    }

    console.log('\n=== GRAPH EDGES ===');
    for (const edge of report.graph.edges) {
        console.log(`  ${edge.source.split('.').pop()} --[${edge.type}]--> ${edge.target.split('.').pop()} (x${edge.weight})`);
    }
}

main().catch(console.error);
