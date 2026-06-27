package com.example.school;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;

/**
 * Well-architected REST controller: injected service dependency,
 * uses DTOs, delegates all logic to service layer.
 */
@RestController
@RequestMapping("/api/students")
public class WellArchitectedController {

    @Autowired
    private StudentService studentService;

    public WellArchitectedController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/{id}")
    public StudentDTO getStudent(@PathVariable String id) {
        Student student = studentService.findStudent(id);
        return StudentDTO.fromEntity(student);
    }

    @PostMapping
    public StudentDTO createStudent(@RequestBody @Valid CreateStudentRequest request) {
        Student student = studentService.createStudent(request);
        return StudentDTO.fromEntity(student);
    }

    @GetMapping
    public List<StudentDTO> getAllStudents() {
        List<Student> students = studentService.getAllStudents();
        return students.stream()
                .map(StudentDTO::fromEntity)
                .toList();
    }
}
