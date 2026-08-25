# ENAcademy: Complete Application and System Guide

> This document describes ENAcademy as it is implemented in this repository. It explains the product, architecture, runtime, workflows, data model, security model, technology decisions, delivery process, operations, limitations, and recommended roadmap.

## Table of contents

1. [Product overview](#1-product-overview)
2. [Implemented capabilities](#2-implemented-capabilities)
3. [System architecture](#3-system-architecture)
4. [Component responsibilities](#4-component-responsibilities)
5. [Application workflows](#5-application-workflows)
6. [Authentication and authorization](#6-authentication-and-authorization)
7. [Learning system](#7-learning-system)
8. [Database design](#8-database-design)
9. [API surface](#9-api-surface)
10. [Frontend architecture](#10-frontend-architecture)
11. [Docker and runtime architecture](#11-docker-and-runtime-architecture)
12. [Technology decisions](#12-technology-decisions)
13. [Security design](#13-security-design)
14. [Observability and errors](#14-observability-and-errors)
15. [Development and delivery workflow](#15-development-and-delivery-workflow)
16. [Operations and recovery](#16-operations-and-recovery)
17. [Configuration reference](#17-configuration-reference)
18. [Known limitations](#18-known-limitations)
19. [Recommended roadmap](#19-recommended-roadmap)
20. [Repository map](#20-repository-map)

---

## 1. Product overview

ENAcademy is a full-stack English learning platform centered on a complete first A1–A2 path. It is designed as a portfolio-quality system that demonstrates product design, curriculum modeling, frontend engineering, backend engineering, identity, authorization, durable data, containerization, and operations.

The product idea is that a learner should move from understanding English to using it in a realistic moment. Every lesson therefore joins listening, vocabulary, grammar, a knowledge check, and speaking practice into one ordered experience.

There are two human roles:

- **Student:** creates an account, verifies the email address, waits for approval, and then works through lessons in order.
- **Administrator:** signs in through the same authentication flow and manages student access from a dedicated control panel.

The platform is more than a visual demonstration. Accounts, verification tokens, refresh sessions, course content, lesson completion, XP, scores, saved words, and audit events are stored on the backend.

### Product goals

- Provide a polished, responsive first impression with motion and 3D effects.
- Offer a coherent A1–A2 curriculum instead of disconnected exercises.
- Keep registration open while making course access administrator-controlled.
- Persist real learning progress rather than simulating it in the browser.
- Keep identity, authorization, and business rules on the server.
- Be easy to start and stop through Docker.
- Remain understandable enough to become open source later.

### Current non-goals

- It is not yet a multi-school or multi-tenant learning management system.
- It does not yet contain payments, certificates, instructor authoring, or live classes.
- Speech recognition uses browser capabilities; it is not a phoneme-level pronunciation engine.
- Persian localization translates the interface, not the English material being taught.

---

## 2. Implemented capabilities

### Public experience

- Responsive landing page with animated 3D visuals.
- About page and public curriculum.
- English and Persian application interfaces.
- Right-to-left layout for Persian.
- Light and dark modes.
- Emerald, ocean, violet, sunset, and rose accent palettes.
- Locally persisted display preferences.

### Student experience

- Account registration with validated credentials.
- One-time email verification.
- Administrator approval requirement.
- Authenticated dashboard.
- Sequential lesson unlocking.
- Listening dialogue with text-to-speech.
- Vocabulary cards and saved words.
- Grammar patterns and examples.
- Knowledge checks with feedback.
- Browser speech practice where supported.
- Durable completion, best score, XP, and saved vocabulary.
- Bilingual course and book store with product previews.
- Immediate simulated checkout with no real payment gateway.
- Automatic purchased-course unlock and protected book downloads.
- Purchase history and downloadable Persian PDF invoices.

### Administrator experience

- Environment-bootstrapped administrator account.
- Role-protected administration area.
- Account-state and completion metrics.
- Student directory and approval queue.
- Approve, reject, and suspend actions.
- Prevention of approval before email verification.
- Audit events for sensitive actions.
- Commerce control center for pricing, availability, orders, entitlements, and invoice downloads.

### Engineering and operations

- Spring Boot REST API.
- PostgreSQL durable storage.
- Redis login throttling.
- Flyway schema migrations.
- Docker Compose stack.
- Mailpit local email testing.
- OpenAPI/Swagger documentation.
- Health, readiness, liveness, and Prometheus endpoints.
- GitHub Actions quality gates.
- Safe start and stop scripts.

---

## 3. System architecture

### 3.1 System context

~~~mermaid
flowchart LR
    Student[Student] --> Browser[Web browser]
    Admin[Administrator] --> Browser
    Browser -->|HTTP port 3000| Next[Next.js web application]
    Next -->|Same-origin API proxy| API[Spring Boot API]
    API -->|SQL transactions| PostgreSQL[(PostgreSQL)]
    API -->|Login counters| Redis[(Redis)]
    API -->|SMTP verification email| SMTP[SMTP service]
    SMTP --> Mailpit[Mailpit locally]
    GitHub[GitHub repository] --> Actions[GitHub Actions]
    Actions -->|Test and build| Images[Production images]
~~~

The browser sees Next.js as its primary origin. Requests under /api are rewritten by Next.js to Spring Boot. The frontend never needs to know internal Docker hostnames.

### 3.2 Container architecture

~~~mermaid
flowchart TB
    subgraph Host[Developer or deployment host]
        subgraph Compose[Docker Compose network]
            Frontend[frontend - Next.js 16]
            Backend[backend - Spring Boot and Java 21]
            DB[(PostgreSQL 17)]
            Cache[(Redis 8)]
            Mail[Mailpit SMTP and inbox]
            Frontend --> Backend
            Backend --> DB
            Backend --> Cache
            Backend --> Mail
        end
        DB --- DBVolume[(postgres_data volume)]
        Cache --- RedisVolume[(redis_data volume)]
    end
    User[Browser] --> Frontend
    Developer[Developer] --> Mail
~~~

Only ports 3000, 8080, and 8025 are published. PostgreSQL and Redis remain inside the Compose network to reduce accidental exposure.

### 3.3 Backend layering

~~~mermaid
flowchart LR
    Controller[Controllers - HTTP and validation] --> Service[Services - transactions and rules]
    Service --> Repository[Repositories - JdbcClient SQL]
    Repository --> DB[(PostgreSQL)]
    Service --> Audit[AuditService]
    Service --> Security[Spring Security and JWT]
    Service --> Redis[(Redis)]
    Service --> Mail[JavaMailSender]
~~~

Controllers translate HTTP requests into validated service calls. Services own business rules and transactions. Repositories own SQL and row mapping. This separation prevents presentation choices from becoming security choices.

---

## 4. Component responsibilities

| Component | Responsibility | Data owned |
| --- | --- | --- |
| Browser | Renders UI, holds the short-lived access token in memory, runs optional speech APIs, and stores display preferences | In-memory JWT and non-sensitive preferences |
| Next.js | Public pages, login, dashboard, admin UI, lessons, localization, theming, and API proxying | No authoritative account or progress data |
| Spring Boot | Identity, authorization, approval, learning rules, progress, words, audits, and error contracts | Authoritative application behavior |
| PostgreSQL | Durable source of truth | Users, token hashes, curriculum, progress, saved words, audits |
| Redis | Fast disposable login throttling | Temporary login keys with TTL |
| SMTP/Mailpit | Verification email delivery or local capture | Development mail in Mailpit |
| Flyway | Ordered schema history | Migration records |
| Docker Compose | Service topology, health ordering, environment wiring, and volumes | Runtime configuration |
| GitHub Actions | Automated checks on pushes and pull requests | Workflow results and logs |

### Source-of-truth rule

PostgreSQL is authoritative. The browser must never decide whether somebody is an administrator, whether an account is approved, whether a lesson is unlocked, or how much XP is earned. Spring Boot enforces those rules.

---

## 5. Application workflows

### 5.1 Registration and approval

~~~mermaid
sequenceDiagram
    actor Student
    participant Web as Next.js
    participant API as Spring Boot
    participant DB as PostgreSQL
    participant Mail as SMTP or Mailpit
    actor Admin

    Student->>Web: Enter name, email, password
    Web->>API: POST auth/register
    API->>DB: Insert STUDENT with PENDING status
    API->>DB: Store verification-token hash
    API->>Mail: Send raw one-time link
    API->>DB: Record registration audit
    API-->>Web: Account created

    Student->>Web: Open verification link
    Web->>API: POST auth/verify
    API->>DB: Consume token and verify email
    API->>DB: Record verification audit
    API-->>Web: Waiting for administrator

    Admin->>Web: Open approval queue
    Web->>API: GET admin/students
    Admin->>Web: Approve student
    Web->>API: PATCH student status
    API->>DB: Validate email and update status
    API->>DB: Record status-change audit
~~~

Public registration never accepts a role. Every registration creates a STUDENT with PENDING status. This prevents a malicious browser from submitting an administrator role.

### 5.2 Account state model

Email verification and administrator status are separate facts.

~~~mermaid
stateDiagram-v2
    [*] --> PendingUnverified: Student registers
    PendingUnverified --> PendingVerified: Valid email link
    PendingVerified --> Approved: Admin approves
    PendingVerified --> Rejected: Admin rejects
    Approved --> Suspended: Admin suspends
    Rejected --> Approved: Admin reconsiders
    Suspended --> Approved: Admin restores
~~~

Learning access requires both an email verification timestamp and APPROVED status.

### 5.3 Sign-in and refresh

~~~mermaid
sequenceDiagram
    actor User
    participant Web as AuthProvider
    participant API as Auth API
    participant Redis
    participant DB as PostgreSQL

    User->>Web: Submit credentials
    Web->>API: POST auth/login
    API->>Redis: Increment email and IP counter
    API->>DB: Load normalized email
    API->>API: BCrypt verification
    API->>DB: Check verification and approval
    API->>Redis: Clear successful counter
    API->>DB: Store refresh-token hash
    API-->>Web: Access JWT and HttpOnly cookie
    Web->>Web: Keep access JWT in memory

    Web->>API: Protected request
    API-->>Web: 401 when JWT expires
    Web->>API: POST auth/refresh with cookie
    API->>DB: Consume old refresh token
    API->>DB: Store rotated refresh token
    API-->>Web: New JWT and cookie
    Web->>API: Retry request once
~~~

On application initialization, AuthProvider attempts refresh. A valid cookie restores the session without placing the access token in persistent browser storage.

### 5.4 Administrator workflow

1. Spring Security requires ROLE_ADMIN for every administration endpoint.
2. The overview aggregates pending, approved, rejected, and suspended counts.
3. The list can be filtered by account status.
4. Approving an unverified student returns a conflict error.
5. Administrator accounts cannot be changed through the student endpoint.
6. Every successful status change stores actor, target, previous status, new status, and time.

### 5.5 Lesson completion

~~~mermaid
flowchart TD
    Start[Approved student opens dashboard] --> Next[Find next incomplete lesson]
    Next --> Request[Request lesson]
    Request --> Approved{Account still approved?}
    Approved -- No --> Denied[403]
    Approved -- Yes --> Unlock{Earlier lessons complete?}
    Unlock -- No --> Locked[Locked response]
    Unlock -- Yes --> Player[Listen - Words - Grammar - Check - Speak]
    Player --> Submit[Submit completion]
    Submit --> Recheck{Server checks unlock again}
    Recheck -- No --> Conflict[409]
    Recheck -- Yes --> Upsert[Upsert best score and XP]
    Upsert --> Audit[Write completion audit]
    Audit --> Dashboard[Return updated dashboard]
~~~

The unlock rule runs when content is requested and again when completion is submitted. A manually crafted browser request therefore cannot bypass the server rule.

---

### 5.6 Beta purchase, entitlement, and invoice

~~~mermaid
flowchart TD
    Browse[Approved student opens Store] --> Preview[Preview course or book]
    Preview --> Approve[Approve beta purchase]
    Approve --> Validate{Active and not already owned?}
    Validate -- No --> Conflict[Reject safely]
    Validate -- Yes --> Transaction[Single PostgreSQL transaction]
    Transaction --> Order[Approved order and item snapshots]
    Transaction --> Invoice[Invoice number and issue time]
    Transaction --> Entitlement[Durable product entitlement]
    Entitlement --> Course{Product type}
    Course -- Course --> Unlock[Unlock purchased A1 or A2 level]
    Course -- Book --> Download[Authorize protected PDF]
    Invoice --> Render[Generate Persian PDF on demand]
~~~

There is no bank redirect and no real payment. The transaction is approved immediately, uses whole toman values, and records no payment credentials. The invoice is explicitly labeled آزمایشی, uses Persian digits and a Jalali date, and is not represented as a tax invoice or bank receipt.

Course entitlement is checked together with same-level lesson sequence. Buying A2 therefore unlocks its first lesson without requiring A1, while later A2 lessons still require earlier A2 completion. Book files are application resources, but the download route returns them only after an ownership check.

#### Purchase-to-invoice sequence

~~~mermaid
sequenceDiagram
    actor Student
    participant Web as Next.js Store
    participant API as Spring CommerceService
    participant DB as PostgreSQL
    participant PDF as InvoicePdfService

    Student->>Web: Confirm one checkout
    Web->>API: POST /store/purchases with product IDs
    API->>DB: Validate active products and ownership
    DB-->>API: Current product names and toman prices
    API->>DB: Begin transaction
    API->>DB: Insert one approved purchase_order
    API->>DB: Insert one immutable item snapshot per product
    API->>DB: Insert one uniquely numbered invoice
    API->>DB: Insert course/book entitlements
    API->>DB: Commit transaction
    API-->>Web: Order, invoice ID/number, item names, date, and totals
    Web-->>Student: Show purchase success and invoice action
    Student->>Web: Download this invoice
    Web->>API: GET /store/invoices/{invoiceId}/pdf
    API->>DB: Verify ownership and load invoice source data
    DB-->>API: Buyer, issue date, item snapshots, and totals
    API->>PDF: Render Persian A4 invoice
    PDF-->>Student: Protected PDF download
~~~

Each checkout is one purchase and creates exactly one invoice in the same database transaction. A later checkout creates a different order, invoice ID, invoice number, and issue date. When one checkout contains multiple products, its single invoice contains one line for every purchased product.

| Invoice content | Durable source | PDF presentation |
|---|---|---|
| Invoice identity | `invoices.invoice_number` | Unique `ENA-######` number |
| Purchase date | `invoices.issued_at` | Persian digits and Jalali date |
| Purchased item name | `purchase_order_items.title_fa` | One Persian line per purchased item |
| Quantity | `purchase_order_items.quantity` | Quantity column |
| Unit price | `purchase_order_items.unit_price_toman` | Formatted toman amount |
| Item total | `purchase_order_items.line_total_toman` | Per-line total |
| Purchase total | `purchase_orders.total_toman` | Final payable total |
| Customer | User name and email joined through the order | Buyer information section |

The item name and price are copied into immutable order-item snapshots at checkout. A later catalog edit therefore cannot rewrite an older invoice. PostgreSQL enforces `invoices.order_id` as unique, while the service creates the order, invoice, item snapshots, and entitlements atomically; a failure rolls back the complete purchase instead of leaving a partial invoice or partial access grant.

## 6. Authentication and authorization

### Passwords

- Registration requires 10 to 72 characters.
- Passwords need uppercase, lowercase, and a number.
- BCrypt cost factor is 12.
- Only BCrypt hashes are stored.
- Original passwords are never returned or logged by application code.

The 72-character maximum matches BCrypt's practical input boundary.

### Access tokens

- Signed HS256 JWT.
- Default lifetime: 15 minutes.
- Signing secret must contain at least 32 bytes.
- Claims contain user UUID, role, email, name, issuer, issue time, and expiration.
- Stored only in frontend module memory.

### Refresh tokens

- 32 cryptographically random bytes, URL-safe Base64 encoded.
- Default lifetime: 14 days.
- Raw value stays in an HttpOnly, SameSite Strict cookie.
- Cookie path is limited to the authentication API.
- Only a SHA-256 hash is stored in PostgreSQL.
- Tokens rotate on refresh.
- Logout revokes the current token and expires the cookie.

### Email tokens

- Cryptographically random and single-use.
- Raw token exists only in the verification link.
- SHA-256 hash is stored in PostgreSQL.
- Default expiration is 24 hours.
- A used timestamp prevents reuse.

### Access rules

| Resource | Rule |
| --- | --- |
| Registration, verification, login, refresh, logout | Public |
| Health and API documentation | Public in current configuration |
| Curriculum summary | Public GET |
| Dashboard, lessons, words | Authenticated plus database approval check |
| Administration API | JWT role must be ADMIN |

Protected business operations reload the current account from PostgreSQL, so suspension takes effect without waiting for the access JWT to expire.

---

## 7. Learning system

### Curriculum shape

- Two CEFR levels: A1 and A2.
- Eight modules.
- Sixteen lessons.
- Two lessons per module.
- Each lesson stores duration and XP.
- Six experience steps: listening, words, grammar, check, speaking, completion.

### Curriculum publishing

~~~mermaid
flowchart LR
    Author[Edit curriculum TypeScript] --> Export[Run curriculum export]
    Export --> JSON[Backend curriculum JSON]
    JSON --> Image[Build backend image]
    Image --> Seeder[Startup seeder]
    Seeder --> Modules[(course_modules)]
    Seeder --> Lessons[(lessons and JSONB)]
~~~

The TypeScript source is convenient for authoring and type checking. A deterministic export creates the backend seed. Startup inserts missing IDs with conflict-safe SQL.

Changing an already-seeded lesson does not overwrite production content. Existing lesson changes should use a reviewed migration or a future content-versioning mechanism.

### Sequential unlocking

A lesson is unlocked only when no earlier positioned lesson lacks completed progress for the student. PostgreSQL performs the check with NOT EXISTS, keeping the rule authoritative.

### Idempotent completion

The unique user-and-lesson constraint and upsert provide these guarantees:

- The first completion inserts one row.
- Repeating a lesson updates the same row.
- The highest score is retained.
- The highest XP value is retained.
- Duplicate progress rows cannot be created.

### Saved words

Words are normalized to lowercase and unique per user. Re-saving is harmless, and removal affects only that user's matching word.

### Speaking practice

The browser Web Speech API provides text-to-speech and, where available, recognition. A lightweight phrase-overlap score gives immediate feedback. This is motivational practice, not formal pronunciation grading. A future speech service would require explicit consent, privacy controls, retention rules, and cost management.

---

## 8. Database design

### Entity relationship diagram

~~~mermaid
erDiagram
    USERS ||--o{ EMAIL_VERIFICATION_TOKENS : receives
    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ LESSON_PROGRESS : completes
    USERS ||--o{ SAVED_WORDS : saves
    USERS o|--o{ AUDIT_EVENTS : acts_in
    USERS ||--o{ PURCHASE_ORDERS : places
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : contains
    PURCHASE_ORDERS ||--|| INVOICES : generates
    USERS ||--o{ PRODUCT_ENTITLEMENTS : owns
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : snapshots
    PRODUCTS ||--o{ PRODUCT_ENTITLEMENTS : grants
    COURSE_MODULES ||--o{ LESSONS : contains
    LESSONS ||--o{ LESSON_PROGRESS : records

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar role
        varchar status
        timestamptz email_verified_at
    }
    EMAIL_VERIFICATION_TOKENS {
        uuid id PK
        uuid user_id FK
        char token_hash UK
        timestamptz expires_at
        timestamptz used_at
    }
    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        char token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
    }
    COURSE_MODULES {
        varchar id PK
        varchar level
        integer unit_number UK
        integer position
    }
    LESSONS {
        varchar slug PK
        varchar module_id FK
        integer position
        integer xp
        jsonb content
    }
    LESSON_PROGRESS {
        uuid id PK
        uuid user_id FK
        varchar lesson_slug FK
        boolean completed
        integer score
        integer xp_earned
    }
    SAVED_WORDS {
        uuid id PK
        uuid user_id FK
        varchar word
    }
    AUDIT_EVENTS {
        uuid id PK
        uuid actor_user_id FK
        varchar action
        jsonb details
    }
~~~

### Table responsibilities

| Table | Purpose | Safeguards |
| --- | --- | --- |
| users | Identity, role, approval, verification | Unique email and constrained role/status |
| email_verification_tokens | Mailbox-control proof | Unique hash, expiration, used time |
| refresh_tokens | Rotating sessions | Unique hash, expiration, revocation |
| course_modules | Ordered module metadata | Unique unit and position |
| lessons | Lesson metadata and activities | Module FK, JSONB content, order index |
| lesson_progress | Per-user lesson result | Unique user/lesson, score 0–100 |
| saved_words | Vocabulary bank | Unique user/word |
| products | Bilingual beta catalog and delivery target | Type/target checks, unique slug, nonnegative toman price |
| purchase_orders | Approved order header and totals | User FK, constrained status/currency |
| purchase_order_items | Immutable purchased product snapshots | Order/product FKs and positive quantities |
| invoices | Invoice identity and issue time | Unique order and number |
| product_entitlements | Course/book ownership | Unique user/product and granting order |
| audit_events | Security and product history | Actor reference and JSONB details |

### Why relational columns plus JSONB

Identity, ownership, uniqueness, ordering, and reporting use relational columns and constraints. Flexible lesson activities use JSONB. This avoids many exercise-specific tables without giving up relational integrity for the important domain.

### Cascades and retention

- User deletion cascades to tokens, progress, and saved words.
- Module deletion cascades to lessons and their progress.
- Audit events survive actor deletion by setting the actor reference to null.
- User deletion is not currently exposed by the API.
- Audit retention is currently indefinite.

### Time

PostgreSQL stores timezone-aware timestamps and the backend uses UTC. This avoids ambiguous server-local time after deployment.

---

## 9. API surface

Base path: /api/v1

### Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | /auth/register | Create pending student and send verification |
| POST | /auth/verify | Consume verification token |
| POST | /auth/login | Create session |
| POST | /auth/refresh | Rotate refresh token and return JWT |
| POST | /auth/logout | Revoke session and expire cookie |
| GET | /auth/me | Return current user |

### Learning

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /learning/curriculum | Public curriculum summary |
| GET | /learning/dashboard | Progress, words, XP, totals |
| GET | /learning/lessons/{slug} | Content and unlock state |
| POST | /learning/lessons/{slug}/complete | Persist score and XP |
| GET | /learning/words | Saved words |
| PATCH | /learning/words | Save or remove a word |

### Administration

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /admin/students | Metrics and student list |
| PATCH | /admin/students/{id}/status | Change student status |
| GET | /admin/audit | Latest 50 audit records |
| GET | /admin/commerce | Commerce metrics, catalog, and recent orders |
| PATCH | /admin/commerce/products/{id} | Change beta price or availability |
| GET | /admin/commerce/invoices/{id}/pdf | Download any customer invoice |

### Store and purchases

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /store/products | Active catalog plus ownership state |
| POST | /store/purchases | Approve beta order and grant access |
| GET | /store/purchases | Student order and invoice history |
| GET | /store/invoices/{id}/pdf | Download owned Persian invoice |
| GET | /store/books/{productId}/download | Download an owned book |

### Error contract

The backend uses ProblemDetail responses with HTTP status, stable code, detail, and type. Validation failures also include a field-to-message map. Stable codes allow future frontend localization without parsing English text.

---

## 10. Frontend architecture

### Routes

| Route | Audience | Purpose |
| --- | --- | --- |
| / | Public | Landing page |
| /about | Public | Story and philosophy |
| /curriculum | Public | A1–A2 path |
| /login | Public | Registration and sign-in |
| /verify | Public | Verification result |
| /dashboard | Approved student | Purchased learning overview |
| /store | Approved student | Course/book previews and beta checkout |
| /purchases | Approved student | Purchases, downloads, and invoice tabs |
| /learn/[lessonId] | Entitled student | Lesson player |
| /admin | Administrator | Student management |
| /admin/commerce | Administrator | Products, orders, access, and invoices |

### Session provider

AuthProvider:

- Holds the access JWT in memory.
- Restores a session through refresh on initialization.
- Adds bearer authorization to API calls.
- Attempts one refresh and retry after a 401.
- Provides registration, login, logout, user state, and typed API access.

Client redirects are only user experience. Spring Security is the authorization boundary.

### Localization

- Interface locales: English and Persian.
- Root language and direction change dynamically.
- Persian uses RTL layout.
- Curriculum titles and objectives have Persian interface copies.
- English teaching material stays English by design.

### Theme system

- Light and dark modes.
- Five accent palettes.
- Semantic CSS custom properties.
- Root data attributes choose mode and palette.
- Preferences are stored in local storage under enacademy.preferences.
- A small early script reduces theme flashing.

Only non-sensitive display preferences use local storage. Credentials never do.

### Accessibility and resilience

- Semantic structure and labels.
- Document-level RTL.
- Desktop, tablet, and mobile layouts.
- Reduced-motion support.
- Speech fallback when browser recognition is absent.
- Accessible labels and selection state on display controls.

---

## 11. Docker and runtime architecture

### Startup graph

~~~mermaid
flowchart TD
    Start[Run start-app] --> Validate[Validate Docker and Compose]
    Validate --> Infra[Start PostgreSQL, Redis, Mailpit]
    Infra --> DBHealthy{PostgreSQL healthy}
    Infra --> RedisHealthy{Redis healthy}
    Infra --> MailHealthy{Mailpit healthy}
    DBHealthy --> Backend
    RedisHealthy --> Backend
    MailHealthy --> Backend
    Backend[Start Spring Boot] --> APIHealthy{Readiness healthy}
    APIHealthy --> Frontend[Start Next.js]
    Frontend --> WebHealthy{Web health passes}
    WebHealthy --> Ready[Platform ready]
~~~

Health dependencies prevent the API from racing its infrastructure and prevent the frontend from being reported ready before the API.

### Multi-stage images

**Frontend**

1. Install exact dependencies using npm ci.
2. Build standalone Next.js output.
3. Copy only runtime and static assets.
4. Run as non-root user enacademy.

**Backend**

1. Build the JAR with Maven and Java 21.
2. Copy it to a smaller Java runtime image.
3. Run as non-root user enacademy.
4. Set JVM memory percentage for containers.

### Endpoints

| URL | Service |
| --- | --- |
| http://localhost:3000 | Web app |
| http://localhost:8080/docs | Swagger UI |
| http://localhost:8080/actuator/health | API health |
| http://localhost:8025 | Mailpit inbox |

### Stop behavior

The stop script removes containers and the network but preserves named volumes. Normal stop/start cycles keep learner data.

---

## 12. Technology decisions

### Next.js 16

Chosen for routing, public and authenticated screens, metadata, standalone production packaging, and same-origin API rewrites. A static site could present marketing pages but could not provide this durable authenticated product. The tradeoff is more build complexity than a small SPA.

### React 19 and TypeScript

React suits the lesson player and shared session/preference providers. TypeScript catches curriculum and API shape errors early. The tradeoff is a larger browser application than minimal HTML, so dependencies should remain deliberate.

### Spring Boot 4 and Java 21

Spring supplies mature validation, transactions, security, REST, mail, Redis, metrics, and configuration. Java 21 is an LTS runtime, and records make projections explicit. Keeping rules in a dedicated API creates a strong trust boundary. The tradeoff is higher memory and framework complexity than a small Node or Go service.

### PostgreSQL 17

PostgreSQL was selected because accounts, tokens, modules, progress, saved words, and audits are relational. Foreign keys and unique constraints protect integrity, transactions keep changes consistent, and JSONB holds flexible lesson content.

**Why not MongoDB:** lesson documents fit MongoDB, but identity, token ownership, uniqueness, ordered progress, and cascading relationships strongly favor relational guarantees.

**Why not SQLite:** SQLite is excellent for embedded applications but less suitable for a multi-container, concurrent, production-shaped service.

**Why not MySQL:** MySQL could implement this model. PostgreSQL was preferred for rich JSONB, constraints, standards behavior, and excellent Spring/Flyway support.

### JdbcClient and explicit SQL

Queries such as lesson unlocking and conflict-safe completion are clearer in SQL. Explicit SQL avoids hidden ORM behavior and N+1 surprises. Hibernate validates the schema, while current repositories use JdbcClient. The tradeoff is maintaining SQL during schema refactors.

### Redis 8

Atomic increments and TTL expiration are ideal for login attempts. Rate limiting stays off PostgreSQL. Redis is disposable; it is not the source of truth.

Redis failure currently fails open to preserve authentication availability. That briefly weakens throttling during an outage. A higher-risk deployment could fail closed or add gateway limits.

### Flyway

Flyway makes schema changes ordered, reviewable, and reproducible. Hibernate automatic DDL is disabled. The tradeoff is that developers must create forward-only migrations instead of editing history.

### Docker Compose

Docker provides consistent versions, health ordering, internal networking, and named volumes with one start command. It uses more local resources, but scripts reduce the friction.

### Mailpit and SMTP

Mailpit tests a real email workflow without sending local messages externally. Standard SMTP lets production replace it with a managed provider. Mailpit is development-only.

### JWT plus rotating refresh cookie

Short JWTs provide stateless API authorization. Memory-only access tokens reduce persistence. HttpOnly refresh cookies reduce JavaScript exposure, while rotation and database hashes provide revocation.

Local storage was rejected for auth tokens because it is persistent and directly readable by JavaScript.

### GitHub Actions

Automated checks run outside the developer machine. Backend and frontend jobs run independently; container validation waits for both. The workflow supports pushes to main and pull requests.

### Mermaid in Markdown

GitHub renders Mermaid directly. Diagrams remain searchable, reviewable text and can evolve with the code.

---

## 13. Security design

### Implemented controls

- BCrypt cost 12.
- Server-assigned roles.
- Separate email verification and approval.
- One-time 24-hour verification tokens.
- Token hashes at rest.
- 15-minute access JWT.
- Rotating refresh sessions.
- HttpOnly and SameSite Strict cookie.
- Role-protected admin API.
- Database-backed approval checks.
- Eight-attempt, 15-minute login throttling.
- Request validation.
- Environment CORS allowlist.
- Non-root application containers.
- Environment-driven secrets.
- Audit events for sensitive workflows.
- Generic login credential errors.

### Trust boundaries

~~~mermaid
flowchart LR
    Input[Untrusted browser input] --> Validation[Validation]
    Validation --> AuthN[Credential or JWT validation]
    AuthN --> AuthZ[Role and database status]
    AuthZ --> Rules[Transactional rules]
    Rules --> SQL[Parameterized SQL]
    SQL --> DB[(Database constraints)]
~~~

Client-side locks improve usability but never replace server enforcement.

### Production requirements

- Replace every development secret.
- Use HTTPS and secure cookies.
- Restrict CORS to exact origins.
- Configure trusted reverse-proxy headers.
- Use authenticated TLS SMTP.
- Keep PostgreSQL and Redis private.
- Add CSP and edge security headers.
- Add dependency, secret, and image scanning.
- Define personal-data and audit retention.
- Test database restoration.
- Protect production branches and environments.

### Current security limitations

- Compose defaults are local only.
- CSRF is disabled; the current design relies on bearer auth and a strict same-site refresh cookie. Cross-origin cookie changes need a new review.
- The rate key uses a compact Java hash and can theoretically collide. Production hardening should use SHA-256 or HMAC.
- Individual JWTs cannot be revoked before their short expiration.
- No password reset, MFA, breached-password check, or admin session manager exists.
- Audit data is append-only through current APIs, but database-level immutability permissions are not configured.

---

## 14. Observability and errors

Spring Boot Actuator exposes health, readiness, liveness, info, and Prometheus metrics. Compose uses readiness for startup ordering. Production should feed these to monitoring and restrict sensitive actuator endpoints.

Springdoc provides OpenAPI and Swagger UI at /docs.

Expected business failures use ProblemDetail. Examples include:

- EMAIL_ALREADY_REGISTERED
- INVALID_VERIFICATION_TOKEN
- INVALID_CREDENTIALS
- EMAIL_NOT_VERIFIED
- AWAITING_APPROVAL
- LOGIN_RATE_LIMITED
- ACCOUNT_NOT_APPROVED
- LESSON_LOCKED
- STUDENT_NOT_FOUND
- VALIDATION_FAILED

The frontend currently displays server detail. A future improvement should map stable codes to translated UI messages.

---

## 15. Development and delivery workflow

### Local workflow

~~~mermaid
flowchart LR
    Edit[Edit source] --> Check[Tests, lint, type-check]
    Check --> Build[Build applications or images]
    Build --> Start[Start Docker stack]
    Start --> Verify[Browser, API, and Mailpit checks]
    Verify --> Commit[Commit focused change]
    Commit --> Push[Push GitHub]
    Push --> CI[GitHub Actions]
~~~

Recommended commands:

~~~bash
./start-app.sh

cd backend
./mvnw --batch-mode verify

cd ../frontend
npm ci
npm run lint
npm run typecheck
npm run build

cd ..
docker compose config --quiet
docker compose build
~~~

### CI pipeline

~~~mermaid
flowchart TD
    Event[Push to main or pull request] --> Backend[Java 21 and Maven verify]
    Event --> Frontend[Node 22, install, lint, type-check, build]
    Backend --> Gate{Both pass?}
    Frontend --> Gate
    Gate -- Yes --> Containers[Validate Compose and build images]
    Gate -- No --> Fail[Workflow fails]
    Containers --> Success[Workflow succeeds]
~~~

### Open-source collaboration

The current workflow accepts direct main pushes and pull requests. A future public flow should be:

1. Contributor forks or creates a feature branch.
2. Contributor makes a focused change with tests and documentation.
3. Contributor opens a pull request into main.
4. CI runs.
5. The owner reviews behavior, security, schema, and docs.
6. The owner merges from GitHub after checks pass.

This is a standard contribution flow, not an extra permanent branch layer.

### Database changes

1. Add a new versioned SQL migration.
2. Never edit a migration already used in a shared environment.
3. Test the full migration chain on clean PostgreSQL.
4. Review indexes, constraints, cascades, and recovery impact.
5. Update database documentation.

### Curriculum changes

1. Edit frontend/lib/curriculum.ts.
2. Run make curriculum.
3. Review generated backend JSON.
4. New IDs may be inserted by the startup seeder.
5. Existing production lessons need a migration or future content versioning.

---

## 16. Operations and recovery

### Start and stop

~~~bash
./start-app.sh
./stop-app.sh
~~~

The start script validates Docker, builds, starts in the background, waits for health, and prints service URLs. The stop script preserves data volumes.

### Persistent volumes

| Service | Volume | Container path |
| --- | --- | --- |
| PostgreSQL | enacademy-platform_postgres_data | /var/lib/postgresql/data |
| Redis | enacademy-platform_redis_data | /data |

Do not edit volume files manually.

### Backup

~~~bash
docker compose exec -T postgres sh -c \
  'pg_dump -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -Fc' \
  > enacademy-backup.dump
~~~

Backups may contain email addresses, password hashes, token hashes, audits, and learning history. Treat them as sensitive.

### Restore

~~~bash
docker compose stop frontend backend
docker compose exec -T postgres sh -c \
  'pg_restore --clean --if-exists --no-owner -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\"' \
  < enacademy-backup.dump
docker compose up -d --wait backend frontend
~~~

Test restoration before depending on a backup process.

### Destructive reset

~~~bash
docker compose down --volumes --remove-orphans
./start-app.sh
~~~

This permanently removes local application data unless a backup exists. It is not the normal stop operation.

---

## 17. Configuration reference

| Variable | Purpose | Production note |
| --- | --- | --- |
| DATABASE_NAME | PostgreSQL database | Use a dedicated database |
| DATABASE_USER | PostgreSQL role | Grant least privilege |
| DATABASE_PASSWORD | Database credential | Store as secret |
| DATABASE_URL | JDBC connection | Compose generates it |
| REDIS_HOST and REDIS_PORT | Rate-limit connection | Private and authenticated |
| MAIL_HOST and MAIL_PORT | SMTP connection | Use authenticated TLS |
| APP_PUBLIC_URL | Public link origin | Used in verification links |
| APP_ADMIN_NAME | Bootstrap admin name | Applied when absent |
| APP_ADMIN_EMAIL | Bootstrap login | Protect this address |
| APP_ADMIN_PASSWORD | Bootstrap password | Replace before first real startup |
| JWT_SECRET | HS256 key | Random, minimum 32 bytes |
| JWT_ISSUER | JWT issuer | Stable per environment |
| JWT_ACCESS_MINUTES | Access lifetime | Default 15 |
| JWT_REFRESH_DAYS | Refresh lifetime | Default 14 |
| APP_COOKIE_SECURE | Secure cookie flag | True with HTTPS |
| ALLOWED_ORIGINS | CORS allowlist | Exact frontend origins |
| BACKEND_URL | Next.js proxy destination | Docker service URL locally |
| SITE_URL | Metadata base | Public deployed origin |
| ENACADEMY_START_TIMEOUT | Health wait seconds | Default 240 |

Never commit real environment files, secrets, backups, or database exports.

---

## 18. Known limitations

### Product

- No password reset or email-change flow.
- No verification-email resend endpoint.
- No MFA.
- No real payment gateway, refunds, tax integration, certificates, instructor role, or organizations. Beta orders are approved immediately.
- No content-management UI.
- No approval notification.
- No admin pagination, search, or bulk actions.
- No self-service data export or deletion.

### Learning

- Sixteen lessons are a focused first release, not every CEFR outcome.
- Browser speech availability varies.
- Phrase matching is not formal pronunciation assessment.
- No spaced-repetition scheduler.
- Mastery rules remain deliberately simple.

### Technical

- No scheduled token cleanup.
- Audit retention is indefinite.
- The admin UI does not yet show the existing audit API.
- Rate limiting covers login only.
- No queue, worker, CDN, or object storage.
- No end-to-end browser suite in CI.
- Local volumes are not production disaster recovery.
- One HS256 secret signs tokens per environment.

---

## 19. Recommended roadmap

### Phase 1: hardening

- Replace all development secrets.
- Deploy behind HTTPS.
- Add CSP and security headers.
- Add password reset and verification resend.
- Add scheduled token cleanup.
- Add structured logs and request correlation.
- Add end-to-end tests for registration, approval, login, completion, and suspension.
- Add dependency, secret, and image scanning.

### Phase 2: managed infrastructure

- Managed PostgreSQL with encryption, backups, and point-in-time recovery.
- Private authenticated Redis or gateway rate limiting.
- Transactional email provider.
- Deployment secret manager.
- Central metrics, logs, and alerts.

### Phase 3: learning depth

- Expand curriculum and formal CEFR mapping.
- Add spaced repetition.
- Add progress history and mastery analytics.
- Add speech scoring only after privacy and consent design.
- Improve captions, transcripts, and keyboard navigation.

### Phase 4: open-source readiness

- Add an explicit license.
- Add code of conduct and security policy.
- Protect main for outside contributions.
- Add issue and pull-request templates.
- Publish non-personal development fixtures.
- Document versioning and releases.

---

## 20. Repository map

~~~text
ENAcademy/
├── frontend/
│   ├── app/                         Routes and styles
│   ├── components/
│   │   ├── AuthProvider.tsx         Session lifecycle
│   │   ├── PreferencesProvider.tsx  Language and theme state
│   │   └── LessonPlayer.tsx         Interactive lesson flow
│   ├── lib/
│   │   ├── curriculum.ts            Editable curriculum
│   │   └── i18n.ts                  English and Persian UI
│   ├── Dockerfile                   Standalone non-root image
│   └── next.config.ts               API proxy
├── backend/
│   ├── src/main/java/com/enacademy/
│   │   ├── auth/                    Identity and sessions
│   │   ├── admin/                   Approval and audit access
│   │   ├── learning/                Curriculum and progress
│   │   ├── commerce/                Products, orders, access, and Persian invoices
│   │   ├── config/                  Security and startup seeders
│   │   ├── domain/                  User model
│   │   └── shared/                  Errors and auditing
│   ├── src/main/resources/
│   │   ├── application.yml          Runtime configuration
│   │   ├── curriculum.json          Backend seed
│   │   ├── books/                    Protected demo PDF books
│   │   ├── fonts/                    Embedded invoice fonts
│   │   └── db/migration/            Flyway SQL
│   └── Dockerfile
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── security.md
│   └── system-guide.md
├── scripts/export-curriculum.mjs
├── .github/workflows/ci.yml
├── docker-compose.yml
├── start-app.sh
├── stop-app.sh
├── .env.example
├── CONTRIBUTING.md
└── README.md
~~~

## Related documents

- [README](../README.md)
- [Architecture summary](architecture.md)
- [Database operations](database.md)
- [Security checklist](security.md)
- [Contribution guide](../CONTRIBUTING.md)

---

Update this guide whenever a service, trust boundary, database table, authentication rule, deployment dependency, or major learning workflow changes. Documentation is part of the system. If it disagrees with the code, the code is current behavior and the guide must be corrected in the same change.
