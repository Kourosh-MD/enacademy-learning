package com.enacademy.learning;

import com.enacademy.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name="Learning")
public class LearningController {
    private final LearningService service;
    public LearningController(LearningService service){this.service=service;}
    @GetMapping("/curriculum")
    @Operation(summary="Read the public curriculum",description="Returns modules and lesson summaries without user-specific progress or entitlement data.")
    LearningService.CurriculumView curriculum(){return service.curriculum();}

    @GetMapping("/dashboard")
    @Operation(summary="Read the student dashboard",description="Returns the authenticated student's profile, progress, XP, saved words, and unlocked course levels.",security=@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME))
    LearningService.DashboardView dashboard(@AuthenticationPrincipal Jwt jwt){return service.dashboard(jwt.getSubject());}

    @GetMapping("/lessons/{slug}")
    @Operation(summary="Read one lesson",description="Returns lesson content and its current unlock state for the authenticated student.",security=@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME))
    LearningService.LessonView lesson(@AuthenticationPrincipal Jwt jwt,@PathVariable String slug){return service.lesson(jwt.getSubject(),slug);}

    @PostMapping("/lessons/{slug}/complete")
    @Operation(summary="Complete a lesson",description="Validates sequential access and records the best completion score and earned XP. Repeating the command is safe.",security=@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME))
    LearningService.DashboardView complete(@AuthenticationPrincipal Jwt jwt,@PathVariable String slug,@Valid @RequestBody LearningService.CompleteRequest request){return service.complete(jwt.getSubject(),slug,request.score());}

    @GetMapping("/words")
    @Operation(summary="List saved words",description="Returns the authenticated student's saved vocabulary.",security=@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME))
    List<String> words(@AuthenticationPrincipal Jwt jwt){return service.words(jwt.getSubject());}

    @PatchMapping("/words")
    @Operation(summary="Save or remove a word",description="Applies the requested save state and returns the complete updated vocabulary list.",security=@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME))
    List<String> updateWord(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody LearningService.WordRequest request){return service.updateWord(jwt.getSubject(),request);}
}
