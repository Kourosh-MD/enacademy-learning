# Security notes

- Replace every value marked `replace-with` before deployment.
- Use HTTPS and set `APP_COOKIE_SECURE=true` in production.
- Keep the API and browser application on the same public origin where possible.
- Restrict `ALLOWED_ORIGINS` to the deployed frontend URL.
- Connect production SMTP with authentication and TLS; Mailpit is development-only.
- Back up PostgreSQL and test restoration before accepting real learners.
- Rotate the JWT secret by forcing active sessions to sign in again.
- Run dependency and container image scanning before a public release.

The platform uses BCrypt cost 12 for passwords, constant library password verification, short access-token lifetime, one-time email tokens, rotating refresh tokens, server-side role checks, Redis login throttling, input validation, and immutable audit events for sensitive administrator actions.

Do not commit `.env`, production exports, email lists, or database backups.
