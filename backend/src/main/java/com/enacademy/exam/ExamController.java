package com.enacademy.exam;

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
public class ExamController {
    private final ExamService service;
    public ExamController(ExamService service){this.service=service;}

    @GetMapping
    List<ExamService.ExamSummary> exams(@AuthenticationPrincipal Jwt jwt){return service.list(jwt.getSubject());}

    @PostMapping("/{slug}/attempts")
    ExamService.AttemptView start(@AuthenticationPrincipal Jwt jwt,@PathVariable String slug) {
        return service.start(jwt.getSubject(),slug);
    }

    @GetMapping("/attempts/{attemptId}")
    ExamService.AttemptView attempt(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID attemptId) {
        return service.attempt(jwt.getSubject(),attemptId);
    }

    @PatchMapping("/attempts/{attemptId}/answers")
    ExamService.AttemptState save(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID attemptId,
                                  @Valid @RequestBody ExamService.SaveAnswersRequest request) {
        return service.save(jwt.getSubject(),attemptId,request);
    }

    @PostMapping("/attempts/{attemptId}/submit")
    ExamService.AttemptView submit(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID attemptId) {
        return service.submit(jwt.getSubject(),attemptId);
    }
}
