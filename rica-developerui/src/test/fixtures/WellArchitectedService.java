package com.example.school;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;

/**
 * Well-architected service: injected repository, no self-instantiation,
 * delegates persistence to injected dependency.
 */
@Service
public class WellArchitectedService {

    @Autowired
    private StudentRepository studentRepository;

    private AuditService auditService;

    public WellArchitectedService(StudentRepository studentRepository, AuditService auditService) {
        this.studentRepository = studentRepository;
        this.auditService = auditService;
    }

    public Student findStudent(String id) {
        if (id == null || id.isEmpty()) {
            throw new IllegalArgumentException("ID must not be empty");
        }
        Student student = studentRepository.findById(id);
        if (student != null) {
            auditService.logAccess(id);
            student.updateLastAccessed();
            return student;
        }
        return null;
    }

    public void registerStudent(Student student) {
        if (student == null) {
            throw new IllegalArgumentException("Student must not be null");
        }
        studentRepository.save(student);
        auditService.logRegistration(student.getId());
    }
}
