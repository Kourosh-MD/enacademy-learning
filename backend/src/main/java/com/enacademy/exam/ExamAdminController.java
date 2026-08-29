package com.enacademy.exam;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/exams")
public class ExamAdminController {
    private final ExamService service;
    public ExamAdminController(ExamService service){this.service=service;}

    @GetMapping
    ExamService.AdminOverview overview(){return service.adminOverview();}

    @PatchMapping("/{examId}")
    ExamService.AdminOverview update(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID examId,
                                     @Valid @RequestBody ExamService.AdminUpdateRequest request) {
        return service.updateExam(UUID.fromString(jwt.getSubject()),examId,request);
    }
}
