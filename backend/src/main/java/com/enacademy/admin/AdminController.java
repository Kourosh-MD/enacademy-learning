package com.enacademy.admin;

import com.enacademy.config.OpenApiConfig;
import com.enacademy.domain.UserStatus;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name="Administration")
@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME)
public class AdminController {
    private final AdminService service;
    public AdminController(AdminService service){this.service=service;}
    @GetMapping("/students")
    @Operation(summary="List and filter students",description="Returns account-state metrics and students, optionally filtered by PENDING, APPROVED, REJECTED, or SUSPENDED status.")
    AdminService.AdminOverview students(@RequestParam(required=false) UserStatus status){return service.overview(status);}

    @PatchMapping("/students/{id}/status")
    @Operation(summary="Change a student's status",description="Approves, rejects, suspends, or restores a student and records the transition in the audit log.")
    com.enacademy.auth.AuthModels.UserView status(
        @AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody AdminService.StatusRequest request){
        return service.updateStatus(UUID.fromString(jwt.getSubject()),id,request.status());
    }

    @GetMapping("/audit")
    @Operation(summary="Read recent audit events",description="Returns the latest 50 security and business audit events in reverse chronological order.")
    List<AdminService.AuditView> audit(){return service.recentAudit();}
}
