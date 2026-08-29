package com.enacademy.auth;

import com.enacademy.auth.AuthModels.AuthResponse;
import com.enacademy.auth.AuthModels.EmailRequest;
import com.enacademy.auth.AuthModels.LoginRequest;
import com.enacademy.auth.AuthModels.MessageResponse;
import com.enacademy.auth.AuthModels.RegisterRequest;
import com.enacademy.auth.AuthModels.ResetPasswordRequest;
import com.enacademy.auth.AuthModels.UserView;
import com.enacademy.auth.AuthModels.VerifyRequest;
import com.enacademy.shared.ApiException;
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
    ResponseEntity<MessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        auth.register(request.fullName(), request.email(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(new MessageResponse("Account created. Open your verification email to continue."));
    }

    @PostMapping("/verify")
    MessageResponse verify(@Valid @RequestBody VerifyRequest request) {
        auth.verifyEmail(request.token());
        return new MessageResponse("Email verified. Your account is now waiting for administrator approval.");
    }

    @PostMapping("/verification/resend")
    MessageResponse resendVerification(@Valid @RequestBody EmailRequest request,HttpServletRequest servletRequest) {
        auth.resendVerification(request.email(),clientIp(servletRequest));
        return new MessageResponse("If this account still needs verification, a new email has been sent.");
    }

    @PostMapping("/password/forgot")
    MessageResponse forgotPassword(@Valid @RequestBody EmailRequest request,HttpServletRequest servletRequest) {
        auth.requestPasswordReset(request.email(),clientIp(servletRequest));
        return new MessageResponse("If an account exists for this email, a password reset message has been sent.");
    }

    @PostMapping("/password/reset")
    MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        auth.resetPassword(request.token(),request.password());
        return new MessageResponse("Password changed. Sign in with your new password.");
    }

    @PostMapping("/login")
    ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        var session = auth.login(request.email(), request.password(), clientIp(servletRequest));
        return withRefreshCookie(session.response(), session.refreshToken());
    }

    @PostMapping("/refresh")
    ResponseEntity<AuthResponse> refresh(@CookieValue(name=REFRESH_COOKIE, required=false) String refreshToken) {
        if (refreshToken == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "MISSING_REFRESH_TOKEN", "Sign in to continue.");
        var session = auth.refresh(refreshToken);
        return withRefreshCookie(session.response(), session.refreshToken());
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@CookieValue(name=REFRESH_COOKIE, required=false) String refreshToken) {
        auth.logout(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, expiredCookie().toString()).build();
    }

    @GetMapping("/me")
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
