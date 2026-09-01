package com.enacademy.auth;

import com.enacademy.auth.AuthModels.AuthResponse;
import com.enacademy.auth.AuthModels.EmailRequest;
import com.enacademy.auth.AuthModels.LoginRequest;
import com.enacademy.auth.AuthModels.MessageResponse;
import com.enacademy.auth.AuthModels.RegisterRequest;
import com.enacademy.auth.AuthModels.ResetPasswordRequest;
import com.enacademy.auth.AuthModels.UserView;
import com.enacademy.auth.AuthModels.VerifyRequest;
import com.enacademy.config.OpenApiConfig;
import com.enacademy.shared.ApiException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name="Authentication")
public class AuthController {
    private static final String REFRESH_COOKIE = "enacademy_refresh";
    private final AuthService auth;
    private final long refreshDays;
    private final boolean secureCookie;
    public AuthController(AuthService auth, @Value("${app.jwt.refresh-days}") long refreshDays,
                          @Value("${APP_COOKIE_SECURE:false}") boolean secureCookie) {
        this.auth=auth; this.refreshDays=refreshDays; this.secureCookie=secureCookie;
    }

    @PostMapping("/register")
    @Operation(summary="Register a student",description="Creates a pending student account, hashes the password, and sends a one-time email-verification link.")
    @ApiResponse(responseCode="201",description="Student account created")
    ResponseEntity<MessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        auth.register(request.fullName(), request.email(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(new MessageResponse("Account created. Open your verification email to continue."));
    }

    @PostMapping("/verify")
    @Operation(summary="Verify a student's email",description="Consumes a single-use verification token. The account still requires administrator approval afterward.")
    MessageResponse verify(@Valid @RequestBody VerifyRequest request) {
        auth.verifyEmail(request.token());
        return new MessageResponse("Email verified. Your account is now waiting for administrator approval.");
    }

    @PostMapping("/verification/resend")
    @Operation(summary="Resend email verification",description="Returns a neutral response for every email to avoid account enumeration. Sends a fresh token only when appropriate.")
    MessageResponse resendVerification(@Valid @RequestBody EmailRequest request,HttpServletRequest servletRequest) {
        auth.resendVerification(request.email(),clientIp(servletRequest));
        return new MessageResponse("If this account still needs verification, a new email has been sent.");
    }

    @PostMapping("/password/forgot")
    @Operation(summary="Request password recovery",description="Returns a neutral response and sends a single-use reset link only when the account exists. Requests are rate limited.")
    MessageResponse forgotPassword(@Valid @RequestBody EmailRequest request,HttpServletRequest servletRequest) {
        auth.requestPasswordReset(request.email(),clientIp(servletRequest));
        return new MessageResponse("If an account exists for this email, a password reset message has been sent.");
    }

    @PostMapping("/password/reset")
    @Operation(summary="Reset a password",description="Consumes an unexpired one-time token, stores a new BCrypt password hash, and revokes every refresh session for the user.")
    MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        auth.resetPassword(request.token(),request.password());
        return new MessageResponse("Password changed. Sign in with your new password.");
    }

    @PostMapping("/login")
    @Operation(summary="Sign in",description="Validates credentials and account state, returns a short-lived access JWT, and sets a rotating HttpOnly refresh cookie.")
    ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        var session = auth.login(request.email(), request.password(), clientIp(servletRequest));
        return withRefreshCookie(session.response(), session.refreshToken());
    }

    @PostMapping("/refresh")
    @Operation(summary="Rotate the authenticated session",description="Consumes the current refresh token, returns a new access JWT, and replaces the refresh cookie.",security=@SecurityRequirement(name=OpenApiConfig.REFRESH_COOKIE_SCHEME))
    ResponseEntity<AuthResponse> refresh(@CookieValue(name=REFRESH_COOKIE, required=false) String refreshToken) {
        if (refreshToken == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "MISSING_REFRESH_TOKEN", "Sign in to continue.");
        var session = auth.refresh(refreshToken);
        return withRefreshCookie(session.response(), session.refreshToken());
    }

    @PostMapping("/logout")
    @Operation(summary="Sign out",description="Revokes the presented refresh token and expires the browser cookie.",security=@SecurityRequirement(name=OpenApiConfig.REFRESH_COOKIE_SCHEME))
    @ApiResponse(responseCode="204",description="Session revoked and cookie expired")
    ResponseEntity<Void> logout(@CookieValue(name=REFRESH_COOKIE, required=false) String refreshToken) {
        auth.logout(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, expiredCookie().toString()).build();
    }

    @GetMapping("/me")
    @Operation(summary="Get the current user",description="Returns the user represented by the bearer access JWT.",security=@SecurityRequirement(name=OpenApiConfig.BEARER_SCHEME))
    UserView me(@org.springframework.security.core.annotation.AuthenticationPrincipal Jwt jwt) {
        return UserView.from(auth.requireUser(jwt.getSubject()));
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthResponse response, String refreshToken) {
        var cookie = ResponseCookie.from(REFRESH_COOKIE, refreshToken).httpOnly(true).secure(secureCookie)
            .sameSite("Strict").path("/api/v1/auth").maxAge(Duration.ofDays(refreshDays)).build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(response);
    }

    private ResponseCookie expiredCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "").httpOnly(true).secure(secureCookie)
            .sameSite("Strict").path("/api/v1/auth").maxAge(Duration.ZERO).build();
    }

    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
