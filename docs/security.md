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
