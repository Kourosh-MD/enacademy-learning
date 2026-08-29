# Security guide

ENAcademy applies security in layers: the browser receives defensive headers, Spring validates identity and role, domain services reload current account/ownership state, repositories use parameterized SQL, and PostgreSQL constraints protect persisted facts.

## Implemented controls

- Passwords use BCrypt cost 12 and are never logged or returned.
- Students verify their mailbox and require administrator approval.
- Login, verification resend, and password-reset requests have separate expiring Redis limits.
- Access JWTs expire after 15 minutes and stay in frontend memory.
- Opaque refresh tokens rotate, are stored only as SHA-256 hashes, and use an HttpOnly SameSite Strict cookie.
- Verification and password-reset tokens are random, one-time values; PostgreSQL stores only their SHA-256 hashes.
- Password reset revokes every refresh session belonging to the account.
- A scheduled UTC job deletes expired tokens and old used/revoked tokens.
- ADMIN routes are server-protected and ownership checks protect invoices, books, courses, lessons, exams, and attempts.
- Next.js sends a nonce-based Content Security Policy plus clickjacking, MIME-sniffing, referrer, permission, opener, and resource-policy headers.
- Spring sends corresponding API security headers and enables HSTS on secure responses.
- Every API response receives `X-Request-ID`; the same value is included in structured logs and safe error responses.
- Unexpected failures are logged server-side and return a generic ProblemDetail instead of a stack trace.
- CI exercises registration, verification resend, approval, login, password reset, purchase, lesson completion, and suspension in Chromium.

## Account recovery

Both recovery-request endpoints return a neutral response for existing and unknown email addresses. This prevents account enumeration. A resend replaces any unused verification token. A password-reset request replaces any unused reset token, expires after `PASSWORD_RESET_MINUTES`, and becomes unusable immediately after successful use.

Raw email tokens appear only in local Mailpit/SMTP messages and their one-time links. They must never be placed in logs, analytics, database columns, or issue reports.

## Request correlation and logs

Clients may supply a safe 8–100 character `X-Request-ID`; otherwise Spring creates a UUID. Logs record request ID, method, path without query parameters, response status, and duration. Passwords, bearer tokens, cookies, email-link query strings, and request bodies are deliberately excluded. `LOG_STRUCTURED_FORMAT=logstash` produces machine-readable JSON suitable for a future central log system.

## Scheduled token retention

`TokenCleanupService` runs at `TOKEN_CLEANUP_CRON` (default `03:20 UTC` daily). Expired rows are removed immediately; used verification/reset tokens and revoked refresh tokens are retained for `TOKEN_RETENTION_DAYS` (default 7) before removal. Audit, commerce, exam, and learning records are not part of this cleanup.

## Production boundary

HTTPS deployment was deliberately skipped because this project does not yet have a domain or hosting environment. Before any public deployment:

- choose the domain and host, terminate HTTPS at a trusted proxy/load balancer, redirect HTTP to HTTPS, then set `APP_COOKIE_SECURE=true`;
- configure trusted forwarded headers and restrict `ALLOWED_ORIGINS` to exact public origins;
- replace every `replace-with` development value through protected deployment secrets;
- connect authenticated TLS SMTP instead of Mailpit;
- keep PostgreSQL and Redis private, back up PostgreSQL, and prove restoration;
- review the CSP against any newly introduced external scripts, media, analytics, or payment provider.

Dependency, secret, and container-image scanning are not configured by this change, as requested.

Never commit `.env`, production exports, email lists, raw tokens, database backups, or service credentials.

---

## Additive implementation record — the eight hardening titles

This section uses the exact eight requested hardening titles and records the decision, implementation, linkage, and verification for each one. Earlier security guidance remains unchanged.

### 1. Replace all development secrets — skipped by request

No development secret was replaced during this phase. `.env.example` and Docker defaults remain examples for local use, not production credentials. Before public deployment, generate unique database, administrator, JWT, Redis, and SMTP secrets and inject them through the selected host's protected secret mechanism.

### 2. Deploy behind HTTPS — postponed until hosting exists

No TLS proxy was added because there is no selected domain or deployment host. Adding a local certificate/proxy without the final trust and forwarding topology would not prove production HTTPS. After selecting a host, terminate trusted TLS, redirect HTTP, configure trusted forwarding, restrict allowed origins, enable secure cookies, and verify HSTS on the real domain.

### 3. Add CSP and security headers — implemented

- `frontend/proxy.ts` creates a nonce for each request and builds the Content Security Policy.
- `frontend/app/layout.tsx` applies the nonce to the early preference script.
- Next.js sends CSP, clickjacking, MIME-sniffing, referrer, permissions, opener, and resource-policy protections.
- `SecurityConfig` sends corresponding API headers and enables HSTS when a request is actually secure.
- The Playwright lifecycle asserts the browser-facing security-header contract.

### 4. Add password reset and verification resend — implemented

- Public endpoints accept an email but return the same neutral response whether the account exists or not.
- Independent Redis limits reduce resend/reset abuse without sharing the normal login counter.
- Verification resend replaces an unused verification token.
- Password reset uses a short-lived, one-time, hashed token delivered through SMTP/Mailpit.
- Successful reset updates the BCrypt password and revokes every refresh session for that user.
- Reusing a consumed reset token is rejected and covered by backend integration testing.

### 5. Add scheduled token cleanup — implemented

`TokenCleanupService` runs from the configured cron expression. It removes expired verification, password-reset, and refresh-token rows, then applies the configured retention period to already used/revoked rows. The job reports only aggregate counts in structured logs and never logs raw token material.

### 6. Add structured logs and request correlation — implemented

`CorrelationIdFilter` validates a safe caller-supplied identifier or creates a UUID, places it in logging context, returns it as `X-Request-ID`, and records method, path without query parameters, status, and duration. `ApiExceptionHandler` includes the same identifier in safe ProblemDetail responses. Passwords, request bodies, cookies, bearer tokens, and recovery URLs are intentionally excluded.

### 7. Add end-to-end workflow tests — implemented

The GitHub Actions platform test builds and starts the real Compose services, then Playwright verifies registration, verification resend, email verification, administrator approval, login, password reset, rejection of the old password, login with the new password, purchase, invoice creation, lesson completion, suspension, and denial of later protected access. Backend and frontend suites run independently before the integrated browser gate.

### 8. Add dependency, secret, and image scanning — skipped by request

No dependency scanner, repository secret scanner, or container-image vulnerability scanner was added. Normal build/test gates remain active, but they are not substitutes for scanning. This item should be reconsidered before public open-source releases or production deployment.

### Verification outcome

Items 3–7 passed local compilation/tests and GitHub Actions. Items 1 and 8 are explicitly incomplete by decision. Item 2 is explicitly postponed until a real domain and host provide the information needed for a correct HTTPS design. This status language prevents the documentation from presenting an excluded or postponed control as implemented.
