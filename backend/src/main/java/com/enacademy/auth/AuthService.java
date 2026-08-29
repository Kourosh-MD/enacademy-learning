package com.enacademy.auth;

import com.enacademy.auth.AuthModels.AuthResponse;
import com.enacademy.auth.AuthModels.Session;
import com.enacademy.auth.AuthModels.UserView;
import com.enacademy.domain.Role;
import com.enacademy.domain.UserAccount;
import com.enacademy.domain.UserStatus;
import com.enacademy.shared.ApiException;
import com.enacademy.shared.AuditService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserRepository users;
    private final TokenRepository tokens;
    private final PasswordEncoder passwords;
    private final JwtEncoder jwtEncoder;
    private final VerificationMailer mailer;
    private final RateLimitService rateLimit;
    private final AuditService audit;
    private final String issuer;
    private final long accessMinutes;
    private final long refreshDays;
    private final long passwordResetMinutes;

    public AuthService(UserRepository users, TokenRepository tokens, PasswordEncoder passwords,
                       JwtEncoder jwtEncoder, VerificationMailer mailer, RateLimitService rateLimit,
                       AuditService audit, @Value("${app.jwt.issuer}") String issuer,
                       @Value("${app.jwt.access-minutes}") long accessMinutes,
                       @Value("${app.jwt.refresh-days}") long refreshDays,
                       @Value("${app.auth.password-reset-minutes:60}") long passwordResetMinutes) {
        this.users=users; this.tokens=tokens; this.passwords=passwords; this.jwtEncoder=jwtEncoder;
        this.mailer=mailer; this.rateLimit=rateLimit; this.audit=audit; this.issuer=issuer;
        this.accessMinutes=accessMinutes; this.refreshDays=refreshDays;
        this.passwordResetMinutes=passwordResetMinutes;
    }

    @Transactional
    public void register(String name, String rawEmail, String password) {
        String email = normalizeEmail(rawEmail);
        if (users.findByEmail(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "An account already exists for this email.");
        }
        var user = users.insert(name.trim(), email, passwords.encode(password), Role.STUDENT, UserStatus.PENDING);
        String rawToken = randomToken();
        tokens.createVerification(user.id(), hash(rawToken), Instant.now().plus(Duration.ofHours(24)));
        mailer.send(user.fullName(), user.email(), rawToken);
        audit.record(user.id(), "STUDENT_REGISTERED", "USER", user.id().toString(), Map.of("email", user.email()));
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        var token = tokens.consumeVerification(hash(rawToken)).orElseThrow(() ->
            new ApiException(HttpStatus.BAD_REQUEST, "INVALID_VERIFICATION_TOKEN", "This verification link is invalid or has expired."));
        users.markEmailVerified(token.userId());
        audit.record(token.userId(), "EMAIL_VERIFIED", "USER", token.userId().toString(), Map.of());
    }

    @Transactional
    public void resendVerification(String rawEmail,String ip) {
        String email=normalizeEmail(rawEmail);
        rateLimit.checkVerificationResend(email,ip);
        users.findByEmail(email).filter(user->!user.emailVerified()).ifPresent(user->{
            String rawToken=randomToken();
            tokens.createVerification(user.id(),hash(rawToken),Instant.now().plus(Duration.ofHours(24)));
            mailer.send(user.fullName(),user.email(),rawToken);
            audit.record(user.id(),"VERIFICATION_RESENT","USER",user.id().toString(),Map.of());
        });
    }

    @Transactional
    public void requestPasswordReset(String rawEmail,String ip) {
        String email=normalizeEmail(rawEmail);
        rateLimit.checkPasswordReset(email,ip);
        users.findByEmail(email).ifPresent(user->{
            String rawToken=randomToken();
            tokens.createPasswordReset(user.id(),hash(rawToken),
                Instant.now().plus(Duration.ofMinutes(passwordResetMinutes)));
            mailer.sendPasswordReset(user.fullName(),user.email(),rawToken);
            audit.record(user.id(),"PASSWORD_RESET_REQUESTED","USER",user.id().toString(),Map.of());
        });
    }

    @Transactional
    public void resetPassword(String rawToken,String password) {
        var token=tokens.consumePasswordReset(hash(rawToken)).orElseThrow(()->
            new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PASSWORD_RESET_TOKEN","This password reset link is invalid or has expired."));
        users.updatePassword(token.userId(),passwords.encode(password));
        tokens.revokeAllRefreshForUser(token.userId());
        audit.record(token.userId(),"PASSWORD_RESET_COMPLETED","USER",token.userId().toString(),Map.of());
    }

    @Transactional
    public Session login(String rawEmail, String password, String ip) {
        String email = normalizeEmail(rawEmail);
        rateLimit.checkLogin(email, ip);
        var user = users.findByEmail(email).orElseThrow(this::invalidCredentials);
        if (!passwords.matches(password, user.passwordHash())) throw invalidCredentials();
        if (!user.emailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", "Verify your email before signing in.");
        }
        if (!user.approved()) {
            String code = user.status() == UserStatus.PENDING ? "AWAITING_APPROVAL" : "ACCOUNT_" + user.status().name();
            throw new ApiException(HttpStatus.FORBIDDEN, code, statusMessage(user.status()));
        }
        rateLimit.clearLogin(email, ip);
        audit.record(user.id(), "USER_LOGGED_IN", "USER", user.id().toString(), Map.of());
        return createSession(user);
    }

    @Transactional
    public Session refresh(String rawToken) {
        var stored = tokens.consumeRefresh(hash(rawToken)).orElseThrow(() ->
            new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Your session has expired. Sign in again."));
        var user = users.findById(stored.userId()).orElseThrow(this::invalidCredentials);
        if (!user.approved() || !user.emailVerified()) throw invalidCredentials();
        return createSession(user);
    }

    public void logout(String rawToken) { if (rawToken != null && !rawToken.isBlank()) tokens.revokeByHash(hash(rawToken)); }

    public UserAccount requireUser(String subject) {
        try {
            return users.findById(UUID.fromString(subject)).orElseThrow(this::invalidCredentials);
        } catch (IllegalArgumentException exception) { throw invalidCredentials(); }
    }

    private Session createSession(UserAccount user) {
        Instant now = Instant.now();
        Instant expires = now.plus(Duration.ofMinutes(accessMinutes));
        var claims = JwtClaimsSet.builder().issuer(issuer).issuedAt(now).expiresAt(expires)
            .subject(user.id().toString()).claim("role", user.role().name()).claim("email", user.email())
            .claim("name", user.fullName()).build();
        String access = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        String refresh = randomToken();
        tokens.createRefresh(user.id(), hash(refresh), now.plus(Duration.ofDays(refreshDays)));
        return new Session(new AuthResponse(access, Duration.ofMinutes(accessMinutes).toSeconds(), UserView.from(user)), refresh);
    }

    private String randomToken() { byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private String normalizeEmail(String email) { return email.trim().toLowerCase(java.util.Locale.ROOT); }
    private ApiException invalidCredentials() { return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email or password is incorrect."); }
    private String statusMessage(UserStatus status) { return switch(status) {
        case PENDING -> "Your email is verified. An administrator still needs to approve your account.";
        case REJECTED -> "Your application was not approved.";
        case SUSPENDED -> "Your account is suspended. Contact an administrator.";
        case APPROVED -> "Account approved.";
    }; }

    public static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
}
