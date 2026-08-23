package com.enacademy.admin;

import com.enacademy.domain.UserStatus;
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
public class AdminController {
    private final AdminService service;
    public AdminController(AdminService service){this.service=service;}
    @GetMapping("/students") AdminService.AdminOverview students(@RequestParam(required=false) UserStatus status){return service.overview(status);}
    @PatchMapping("/students/{id}/status") com.enacademy.auth.AuthModels.UserView status(
        @AuthenticationPrincipal Jwt jwt,@PathVariable UUID id,@Valid @RequestBody AdminService.StatusRequest request){
        return service.updateStatus(UUID.fromString(jwt.getSubject()),id,request.status());
    }
    @GetMapping("/audit") List<AdminService.AuditView> audit(){return service.recentAudit();}
}
