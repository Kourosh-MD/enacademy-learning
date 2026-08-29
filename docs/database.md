# Database guide

ENAcademy uses PostgreSQL 17 as its durable source of truth and Redis 8 for short-lived login throttling. Both services run through Docker Compose in local development.

## Where data is stored

Docker Compose stores PostgreSQL and Redis data in named Docker volumes:

| Service | Compose volume | Path inside the container | Purpose |
| --- | --- | --- | --- |
| PostgreSQL | `enacademy-platform_postgres_data` | `/var/lib/postgresql/data` | Accounts, tokens, curriculum, progress, online exams/attempts/answers, products, approved beta orders, entitlements, invoices, saved words, and audit history |
| Redis | `enacademy-platform_redis_data` | `/data` | Temporary login, verification-resend, and password-reset counters, persisted with Redis AOF |

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
| `password_reset_tokens` | One-time password-reset hashes, expiration, use time, and creation time | Belongs to `users`; raw tokens are email-only; successful reset revokes all refresh sessions |
| `course_modules` | A1–A2 unit metadata, outcomes, and ordering | Unit number is unique |
| `lessons` | Lesson metadata and complete activity content in PostgreSQL `JSONB` | Belongs to `course_modules`; module deletion cascades to lessons |
| `lesson_progress` | Per-student completion, best score, earned XP, and timestamps | Unique per user and lesson; scores are constrained to 0–100 |
| `saved_words` | Each student's vocabulary collection | Unique per user and normalized word |
| `products` | Bilingual course/book catalog, toman price, preview, availability, entitlement target, and book resource | Product type and delivery target are constrained; slug is unique |
| `purchase_orders` | Approved beta checkout header and immutable toman totals | Belongs to a user; currency is constrained to TOMAN |
| `purchase_order_items` | Product title/type/price snapshots at purchase time | Belongs to an order and references the original product |
| `invoices` | Stable invoice number and issue timestamp | Exactly one invoice per order; number is unique |
| `product_entitlements` | Durable course access and book-download ownership | Unique per user/product and tied to the granting order |
| `exams` | Bilingual exam identity, course level, duration, pass threshold, publication, and availability window | Slug is unique; dates and scoring ranges are constrained |
| `exam_questions` | Ordered bilingual multiple-choice prompts/options, correct answer, explanation, and points | Unique position per exam; options use validated JSONB |
| `exam_attempts` | One student's durable timer, lifecycle, score, result, save time, and version | Unique per exam/user; active and finalized fields are consistency-checked |
| `exam_answers` | Latest selected option for one attempt/question | Composite primary key prevents duplicate answers |
| `audit_events` | Registration, verification, login, approval, and completion activity | Actor points to `users`; deleting an actor keeps the audit event and clears the reference |

The central relationships are:

```text
users ─┬─< email_verification_tokens
       ├─< refresh_tokens
       ├─< password_reset_tokens
       ├─< lesson_progress >─ lessons >─ course_modules
       ├─< saved_words
       ├─< purchase_orders ─┬─< purchase_order_items >─ products
       │                    └── invoices
       ├─< product_entitlements >─ products
       ├─< exam_attempts ─< exam_answers >─ exam_questions >─ exams
       └─< audit_events
```

## Online exam data flow

The V3 migration creates the four exam tables, performance indexes, and complete seeded A1/A2 exams. Starting an exam uses the unique `(exam_id,user_id)` constraint and `ON CONFLICT` to create exactly one attempt. Saves validate answers, lock the attempt, transform one JSONB batch into one PostgreSQL upsert, and increment the attempt version. Submission locks the same row, calculates the score with one aggregate query, and finalizes the attempt once. Correct answers are returned only after finalization.

The durable `deadline_at` makes PostgreSQL/Spring authoritative for timing. Browser timers are a display convenience and cannot extend an attempt. See [Online exams and 100-user capacity](exam-capacity.md) for query/index details and the reproducible concurrency test.

## Account recovery and token maintenance

The V4 migration, `V4__account_recovery_and_token_maintenance.sql`, adds `password_reset_tokens` and cleanup indexes for all three token tables. Verification resends invalidate the prior unused verification row before inserting a fresh hash. Password-reset requests similarly invalidate the prior unused reset row. A successful reset locks and consumes that row, stores a new BCrypt password hash, and revokes every active refresh token for the account in one transaction.

`TokenCleanupService` runs daily at the configurable UTC cron. It deletes expired rows immediately and deletes used/revoked rows after the configured retention window. This prevents inert authentication data from growing without touching durable user, learning, commerce, invoice, exam, or audit records.

## Curriculum data flow

The editable curriculum source is `frontend/lib/curriculum.ts`. The backend receives a deterministic copy at `backend/src/main/resources/curriculum.json`:

```bash
node scripts/export-curriculum.mjs
# or
make curriculum
```

At startup, `CurriculumSeeder` inserts missing modules and lessons into PostgreSQL. Existing curriculum rows are not overwritten. During development, changing an existing seeded lesson therefore requires a new Flyway migration or a deliberate local database reset. Production curriculum changes should always use an additive, reviewed migration.

## Commerce and invoice data flow

The beta checkout deliberately does not connect to a bank or payment gateway:

1. An approved student chooses one or more active products.
2. Spring validates product availability and confirms that the student does not already own them.
3. One PostgreSQL transaction inserts the approved order, immutable item snapshots, exactly one uniquely numbered invoice, and product entitlements.
4. A course entitlement matches the purchased A1 or A2 level and becomes part of the lesson unlock rule.
5. A book entitlement authorizes the protected PDF download endpoint.
6. Persian invoice PDF bytes are rendered on demand from the durable item names, quantities, unit prices, line totals, final total, and invoice issue date.

Money is stored as whole toman in `BIGINT` columns. No card number, bank token, gateway response, or other payment credential exists in the schema.

Invoice PDFs are not stored in PostgreSQL. The database stores their immutable source data and the backend regenerates the Persian PDF on demand with embedded fonts, Persian digits, and a Jalali issue date. Demo book files live in `backend/src/main/resources/books` and are packaged inside the Spring application image; ownership remains in PostgreSQL.

The `purchase_order_items` title and price snapshots preserve what the student bought even if an administrator later changes the catalog title, price, or active flag. Orders and invoices use restrictive foreign keys so accidental product or user deletion cannot destroy commercial history.

One checkout is one purchase order and one invoice. A checkout containing multiple products produces one invoice with multiple item rows; a later checkout produces a new invoice number and issue timestamp. The unique constraint on `invoices.order_id` enforces that one-to-one relationship.

## Migrations

Flyway is the only schema-change mechanism. Hibernate automatic DDL is disabled.

1. Add a new versioned SQL file such as `V4__add_learning_streaks.sql` under `backend/src/main/resources/db/migration`.
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
SCAN 0 MATCH * COUNT 100
TTL login:<sha256>
TTL password-reset:<sha256>
TTL verification-resend:<sha256>
```

## Retention and production operations

- Expired verification, refresh, and password-reset tokens are removed by a scheduled cleanup job. Used/revoked rows are retained for `TOKEN_RETENTION_DAYS` before deletion.
- Audit, order, invoice, and entitlement records are retained indefinitely unless an explicit retention policy is added.
- Generated invoice bytes are ephemeral; the PDF is recreated from PostgreSQL data for each authorized download.
- Local named volumes are not a production backup strategy.
- Production should use managed PostgreSQL with encrypted storage, automated backups, point-in-time recovery, restricted network access, and monitored capacity.
- Production Redis should require authentication and private networking; its data may be discarded because it is not the system of record.

---

## Additive implementation record — database work completed

This appendix records the database additions made during the current platform phase. No existing migration was rewritten or removed.

### Migration history added

| Migration | Purpose | Important result |
|---|---|---|
| `V2__beta_commerce.sql` | Products, orders, immutable item snapshots, invoices, and entitlements | Every successful simulated checkout creates one durable invoice and unlocks the purchased course or book. |
| `V3__online_exams.sql` | Exams, questions, attempts, and answers plus seeded A1/A2 exams | Exam timing, answers, status, score, and result are authoritative in PostgreSQL. |
| `V4__account_recovery_and_token_maintenance.sql` | Password-reset tokens and cleanup indexes | Password recovery uses one-time hashed tokens and scheduled retention can find expired/old rows efficiently. |

### New exam data flow

1. An administrator changes publication and schedule data in `exams`.
2. An eligible student starts an exam; one `exam_attempts` row is inserted for the user/exam pair.
3. `deadline_at` is calculated by the server and stored durably, so refreshing or changing the browser clock cannot extend the attempt.
4. Changed choices are validated and written to `exam_answers` in one JSONB-backed batch upsert.
5. Submission locks the attempt row, aggregates the grade, writes the final score/status/timestamp, and safely returns the existing result if a retry arrives.
6. Correct answers and bilingual explanations are disclosed only after finalization.

### New recovery-token data flow

1. A recovery request creates a cryptographically random raw token for email delivery.
2. Only its SHA-256 hash, user relationship, expiry, and lifecycle timestamps are stored.
3. Reset consumes the row under a database lock, replaces the BCrypt password hash, and revokes all refresh sessions for the account.
4. The raw reset token cannot be reconstructed from PostgreSQL and cannot be reused after successful consumption.
5. The scheduled cleanup removes expired rows and later removes old used/revoked rows according to retention configuration.

### Concurrency and integrity additions

- Unique user/exam constraints prevent duplicate attempts under simultaneous start requests.
- Unique attempt/question constraints prevent duplicate saved answers.
- Foreign keys ensure answers belong to durable attempts/questions; services additionally verify that the question and option belong to the active exam.
- Attempt row locks serialize save/finalize races, and idempotent finalization makes network retries safe.
- Indexes support published-exam discovery, attempt lookup, answer aggregation, admin reporting, and token cleanup.
- Whole-number toman and immutable order-item snapshots keep past invoice totals stable after later catalog edits.

### Storage outcome

PostgreSQL remains the only source of truth. Redis stores only expiring rate counters, generated invoice PDF bytes are not stored, browser exam state is only a temporary working copy, and local Docker volumes remain development storage rather than a production backup system.
