package com.enacademy.exam;

import com.enacademy.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/exams")
@Tag(name="Exams")
@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME)
public class ExamController {
    private final ExamService service;
    public ExamController(ExamService service){this.service=service;}

    @GetMapping
    @Operation(summary="List the student's exams",description="Returns schedule, entitlement, availability, and current attempt/result state. Expired in-progress attempts are finalized first.")
    List<ExamService.ExamSummary> exams(@AuthenticationPrincipal Jwt jwt){return service.list(jwt.getSubject());}

    @PostMapping("/{slug}/attempts")
    @Operation(summary="Start or resume an exam attempt",description="Atomically creates the student's single attempt or returns the existing attempt. The server owns the deadline.")
    ExamService.AttemptView start(@AuthenticationPrincipal Jwt jwt,@PathVariable String slug) {
        return service.start(jwt.getSubject(),slug);
    }

    @GetMapping("/attempts/{attemptId}")
    @Operation(summary="Resume an exam attempt",description="Returns saved answers, server time, remaining time, and grading details only after final submission.")
    ExamService.AttemptView attempt(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID attemptId) {
        return service.attempt(jwt.getSubject(),attemptId);
    }

    @PatchMapping("/attempts/{attemptId}/answers")
    @Operation(summary="Save changed exam answers",description="Validates and batch-upserts answers for an owned in-progress attempt. Expired attempts are auto-submitted.")
    ExamService.AttemptState save(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID attemptId,
                                  @Valid @RequestBody ExamService.SaveAnswersRequest request) {
        return service.save(jwt.getSubject(),attemptId,request);
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @Operation(summary="Submit and grade an exam",description="Idempotently finalizes an owned attempt, calculates its score, and returns the completed review.")
    ExamService.AttemptView submit(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID attemptId) {
        return service.submit(jwt.getSubject(),attemptId);
    }
}
