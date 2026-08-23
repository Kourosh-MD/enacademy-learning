package com.enacademy.auth;

import com.enacademy.domain.Role;
import com.enacademy.domain.UserAccount;
import com.enacademy.domain.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AuthModels {
    private AuthModels() {}
    public record RegisterRequest(
        @NotBlank @Size(min=2,max=120) String fullName,
        @NotBlank @Email @Size(max=320) String email,
        @NotBlank @Size(min=10,max=72)
        @Pattern(regexp="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$", message="must include uppercase, lowercase, and a number") String password
    ) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record VerifyRequest(@NotBlank String token) {}
    public record MessageResponse(String message) {}
    public record UserView(UUID id, String fullName, String email, Role role, UserStatus status,
                           boolean emailVerified, Instant createdAt) {
        public static UserView from(UserAccount user) {
            return new UserView(user.id(), user.fullName(), user.email(), user.role(), user.status(),
                user.emailVerified(), user.createdAt());
        }
    }
    public record AuthResponse(String accessToken, long expiresIn, UserView user) {}
    public record Session(AuthResponse response, String refreshToken) {}
}
