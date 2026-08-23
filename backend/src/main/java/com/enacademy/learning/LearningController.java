package com.enacademy.learning;

import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/v1/learning")
public class LearningController {
    private final LearningService service;
    public LearningController(LearningService service){this.service=service;}
    @GetMapping("/curriculum") LearningService.CurriculumView curriculum(){return service.curriculum();}
    @GetMapping("/dashboard") LearningService.DashboardView dashboard(@AuthenticationPrincipal Jwt jwt){return service.dashboard(jwt.getSubject());}
    @GetMapping("/lessons/{slug}") LearningService.LessonView lesson(@AuthenticationPrincipal Jwt jwt,@PathVariable String slug){return service.lesson(jwt.getSubject(),slug);}
    @PostMapping("/lessons/{slug}/complete") LearningService.DashboardView complete(@AuthenticationPrincipal Jwt jwt,@PathVariable String slug,@Valid @RequestBody LearningService.CompleteRequest request){return service.complete(jwt.getSubject(),slug,request.score());}
    @GetMapping("/words") List<String> words(@AuthenticationPrincipal Jwt jwt){return service.words(jwt.getSubject());}
    @PatchMapping("/words") List<String> updateWord(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody LearningService.WordRequest request){return service.updateWord(jwt.getSubject(),request);}
}
