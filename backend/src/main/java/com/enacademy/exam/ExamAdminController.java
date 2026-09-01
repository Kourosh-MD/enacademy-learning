package com.enacademy.exam;

import com.enacademy.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name="Administration")
@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME)
public class ExamAdminController {
    private final ExamService service;
    public ExamAdminController(ExamService service){this.service=service;}

    @GetMapping
    @Operation(summary="Read exam operations",description="Returns exam publication, schedules, attempt counts, scores, and recent attempt activity.")
    ExamService.AdminOverview overview(){return service.adminOverview();}

    @PatchMapping("/{examId}")
    @Operation(summary="Update an exam schedule",description="Changes publication, availability window, duration, and pass score, then records an audit event.")
    ExamService.AdminOverview update(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID examId,
                                     @Valid @RequestBody ExamService.AdminUpdateRequest request) {
        return service.updateExam(UUID.fromString(jwt.getSubject()),examId,request);
    }
}
