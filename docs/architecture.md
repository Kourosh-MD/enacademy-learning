# Architecture

## Boundaries

The browser talks to Next.js on one origin. Next.js proxies `/api/*` to Spring Boot, which owns identity, authorization, business rules, and persistence.

```text
Browser -> Next.js -> Spring Boot -> PostgreSQL
                              |--> Redis
                              `--> SMTP / Mailpit
```

- PostgreSQL is the source of truth for accounts, tokens, lessons, progress, saved words, and audits.
- Redis contains disposable rate-limit counters only. Authentication continues if Redis is restarting.
- Mailpit captures development email. Production can use any SMTP provider through environment variables.
- Flyway is the only schema migration mechanism; Hibernate automatic DDL is disabled so the application never mutates the schema implicitly.

## Identity lifecycle

Student access is deliberately two-stage: `email_verified_at` proves mailbox control, while `status` records the administrator decision. Only an email-verified `APPROVED` account can access learning APIs.

The backend assigns `STUDENT` or `ADMIN`; the client never supplies a role. The initial administrator is idempotently bootstrapped from environment variables.

## Session design

- Access tokens are 15-minute signed JWTs kept only in browser memory.
- Refresh tokens are opaque random values in `HttpOnly`, `SameSite=Strict` cookies.
- Only SHA-256 refresh-token hashes are stored in PostgreSQL.
- Refresh tokens rotate on every refresh; logout revokes the current token.
- Protected APIs still read the current account from PostgreSQL, so suspension takes effect without waiting for a token to expire.

## Learning model

Eight modules contain sixteen ordered A1–A2 lessons. Each lesson has listening context, vocabulary, a grammar pattern, a knowledge check, and browser speech practice. The API enforces sequential unlocking and uses idempotent upserts so repeating a lesson cannot duplicate XP records.

## Operational design

Docker Compose provides health-ordered startup. The API exposes readiness, liveness, Prometheus metrics, and OpenAPI documentation. Containers run as non-root users and secrets remain environment-driven.
