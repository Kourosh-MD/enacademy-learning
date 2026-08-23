# Database guide

ENAcademy uses PostgreSQL 17 as its durable source of truth and Redis 8 for short-lived login throttling. Both services run through Docker Compose in local development.

## Where data is stored

Docker Compose stores PostgreSQL and Redis data in named Docker volumes:

| Service | Compose volume | Path inside the container | Purpose |
| --- | --- | --- | --- |
| PostgreSQL | `enacademy-platform_postgres_data` | `/var/lib/postgresql/data` | Accounts, tokens, curriculum, progress, saved words, and audit history |
| Redis | `enacademy-platform_redis_data` | `/data` | Temporary login-attempt counters, persisted with Redis AOF |

The exact host mount point is managed by Docker. On Linux it can be inspected with:

```bash
docker volume inspect enacademy-platform_postgres_data
docker volume inspect enacademy-platform_redis_data
```

On Docker Desktop, the files live inside Docker's virtual machine. Do not edit either volume directly; use PostgreSQL, Redis, migrations, or the documented backup commands.

`./stop-app.sh` and `docker compose down` preserve both volumes. `docker compose down --volumes` permanently deletes them and should only be used when a complete local reset is intended.

## PostgreSQL connection

The database name, user, and password are configured in the root `.env` file:

```dotenv
DATABASE_NAME=enacademy
DATABASE_USER=enacademy
DATABASE_PASSWORD=replace-with-a-strong-database-password
```

Inside the Compose network, Spring connects to `postgres:5432`. PostgreSQL is intentionally not published to a host port. Open an interactive SQL console with:

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Useful commands inside `psql`:

```text
\dt                         list tables
\d users                    describe a table
SELECT count(*) FROM users; count accounts
\q                          exit
```

The PostgreSQL image applies `DATABASE_USER` and `DATABASE_PASSWORD` only when it initializes an empty volume. Changing those values in `.env` later does not rotate the password inside an existing database. For production, rotate the PostgreSQL role password deliberately and update the application secret in the same maintenance window. For disposable local data, use the reset procedure below.

## Schema overview

Flyway creates the application schema from `backend/src/main/resources/db/migration`. PostgreSQL also creates `flyway_schema_history` to record which migrations have run.

| Table | Stored data | Important relationships and rules |
| --- | --- | --- |
| `users` | Student and administrator identity, BCrypt password hash, role, approval status, and verification timestamp | Email is unique; role and status values are constrained |
| `email_verification_tokens` | One-time email-verification token hashes and expiration | Belongs to `users`; raw tokens are never stored; deleted with the user |
| `refresh_tokens` | Rotating session-token hashes, expiration, and revocation | Belongs to `users`; consumed tokens are revoked; deleted with the user |
| `course_modules` | A1–A2 unit metadata, outcomes, and ordering | Unit number is unique |
| `lessons` | Lesson metadata and complete activity content in PostgreSQL `JSONB` | Belongs to `course_modules`; module deletion cascades to lessons |
| `lesson_progress` | Per-student completion, best score, earned XP, and timestamps | Unique per user and lesson; scores are constrained to 0–100 |
| `saved_words` | Each student's vocabulary collection | Unique per user and normalized word |
| `audit_events` | Registration, verification, login, approval, and completion activity | Actor points to `users`; deleting an actor keeps the audit event and clears the reference |

The central relationships are:

```text
users ─┬─< email_verification_tokens
       ├─< refresh_tokens
       ├─< lesson_progress >─ lessons >─ course_modules
       ├─< saved_words
       └─< audit_events
```

## Curriculum data flow

The editable curriculum source is `frontend/lib/curriculum.ts`. The backend receives a deterministic copy at `backend/src/main/resources/curriculum.json`:

```bash
node scripts/export-curriculum.mjs
# or
make curriculum
```

At startup, `CurriculumSeeder` inserts missing modules and lessons into PostgreSQL. Existing curriculum rows are not overwritten. During development, changing an existing seeded lesson therefore requires a new Flyway migration or a deliberate local database reset. Production curriculum changes should always use an additive, reviewed migration.

## Migrations

Flyway is the only schema-change mechanism. Hibernate automatic DDL is disabled.

1. Add a new versioned SQL file such as `V2__add_learning_streaks.sql` under `backend/src/main/resources/db/migration`.
2. Make the migration forward-only and safe for existing data.
3. Run `cd backend && ./mvnw test`; Testcontainers applies every migration to a clean PostgreSQL instance.
4. Start the stack and inspect `flyway_schema_history` before committing.

Never edit a migration that has already run in a shared or production environment. Add another migration instead.

## Backup and restore

Create a compressed PostgreSQL backup while the stack is running:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > enacademy-backup.dump
```

Restore a trusted backup into the configured local database:

```bash
docker compose stop frontend backend
docker compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < enacademy-backup.dump
docker compose up -d --wait backend frontend
```

Backups can contain email addresses, password hashes, session-token hashes, and learning history. Store them as sensitive data and encrypt them outside local development.

## Complete local reset

To permanently delete all local ENAcademy accounts, progress, curriculum rows, audit history, and Redis state:

```bash
docker compose down --volumes --remove-orphans
./start-app.sh
```

This operation cannot be undone without a backup. Normal shutdown should always use `./stop-app.sh`, which does not delete volumes.

## Redis behavior

Redis contains keys shaped like `login:<hash>`. Each key counts failed login attempts for one email/IP combination, expires after 15 minutes, and blocks attempts after the eighth failure. Successful login clears the key. PostgreSQL remains the source of truth, and authentication continues if Redis is temporarily unavailable.

Inspect Redis without publishing it to the host:

```bash
docker compose exec redis redis-cli
SCAN 0 MATCH login:* COUNT 100
TTL login:<hash>
```

## Retention and production operations

- Expired verification and refresh-token records remain inert but are not currently removed by a scheduled cleanup job.
- Audit records are retained indefinitely unless an explicit retention migration or maintenance process is added.
- Local named volumes are not a production backup strategy.
- Production should use managed PostgreSQL with encrypted storage, automated backups, point-in-time recovery, restricted network access, and monitored capacity.
- Production Redis should require authentication and private networking; its data may be discarded because it is not the system of record.
