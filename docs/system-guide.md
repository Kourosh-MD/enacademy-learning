# ENAcademy: Complete Application and System Guide

> This document describes ENAcademy as it is implemented in this repository. It explains the product, architecture, runtime, workflows, data model, security model, technology decisions, delivery process, operations, limitations, and recommended roadmap.

Each of the 20 main parts ends with a **Teaching section**. The original reference and use-case material remains authoritative and unchanged in purpose; the teaching blocks add learning goals, a guided explanation, practical exercises, a success check, and review questions.

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

### Teaching section — Product overview

**Learning goals**

- Explain the problem ENAcademy solves and identify its two human roles.
- Separate product goals from current non-goals.
- Recognize why the platform is a real stateful application rather than a visual demo.

**Lesson.** Start from the learner outcome: use English in a realistic moment. The listening, words, grammar, check, and speaking steps are product choices that serve that outcome. Then trace the two roles. A student owns a learning journey; an administrator controls admission and governance. Notice that registration is deliberately open while learning access is deliberately controlled.

**Guided practice**

1. Write a one-sentence problem statement for ENAcademy.
2. For each proposed feature, classify it as a current goal, current non-goal, or roadmap item.
3. Explain why persistent progress changes the product from a landing page into a platform.
4. Describe one student success metric and one administrator success metric.

**Success check.** You can explain ENAcademy without naming its technologies, and you do not promise certificates, live classes, real payments, or multi-tenancy as existing capabilities.

**Review questions**

1. Why are email verification and administrator approval both part of the product?
2. Which learning step turns passive understanding into active use?
3. What would have to change before this became a multi-school LMS?

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

### Teaching section — Implemented capabilities

**Learning goals**

- Group features by public, student, administrator, and engineering audiences.
- Distinguish a user-visible capability from the infrastructure that supports it.
- Verify claims against an observable screen, API, database record, or CI result.

**Lesson.** A capability is complete only when its full path works. For example, email verification includes the registration form, token creation, message delivery, verification endpoint, database update, and user feedback. Likewise, purchasing includes preview, validation, order and invoice creation, entitlement delivery, history, and protected download.

**Guided practice**

1. Pick one capability from each audience group.
2. Identify its entry screen, backend rule, stored data, and failure state.
3. Mark which capabilities require authentication, approval, ownership, or ADMIN role.
4. Compare the visible feature list with `/docs`, the database tables, and the relevant UI route.

**Success check.** For any feature claim, you can point to both a user-facing result and an authoritative backend or operational result.

**Review questions**

1. Why is dark mode a frontend capability while lesson unlocking is a backend capability?
2. Which capabilities depend on Mailpit, Redis, or PostgreSQL?
3. What evidence proves that a purchased book is protected?

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

### Teaching section — System architecture

**Learning goals**

- Read context, container, and backend-layer diagrams.
- Trace one request from the browser to durable storage and back.
- Explain why each boundary exists.

**Lesson.** Read each diagram at a different zoom level. The context diagram shows people and systems. The container diagram shows deployable processes and networks. The backend-layer diagram shows code responsibilities. The same request appears differently at each level, but the trust direction remains browser → Next.js → Spring → repository → PostgreSQL.

**Guided practice**

1. Trace `GET /api/v1/learning/dashboard` through the same-origin rewrite, security filter, controller, service, repository, and database.
2. Repeat the trace for email verification and identify where SMTP replaces a normal response path.
3. Explain why PostgreSQL and Redis do not publish host ports.
4. Name the layer where HTTP validation, business transactions, and SQL each belong.

**Success check.** You can redraw the architecture from memory and place a new business rule in the service layer instead of the browser or repository.

**Review questions**

1. Why does Next.js proxy `/api` instead of exposing a Docker hostname?
2. What breaks if a controller contains SQL?
3. Which component remains authoritative when the browser state is stale?

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

### Teaching section — Component responsibilities

**Learning goals**

- Assign each fact to one authoritative owner.
- Distinguish durable, temporary, derived, and presentation state.
- Prevent business rules from leaking across boundaries.

**Lesson.** Use the source-of-truth rule whenever two components could disagree. PostgreSQL stores durable facts, Spring interprets and changes them, Next.js presents them, Redis holds disposable counters, and the browser keeps only short-lived session and display state. A component may cache or display a fact without becoming its owner.

**Guided practice**

1. Classify access JWT, theme preference, account status, login counter, invoice total, and lesson completion by owner and lifetime.
2. Imagine the browser says a lesson is unlocked but PostgreSQL says it is locked; decide which result wins.
3. Propose where a future certificate record should live and which service should issue it.

**Success check.** You never rely on local storage, a hidden button, or a route redirect to enforce identity, role, ownership, price, or learning sequence.

**Review questions**

1. Why is Redis allowed to lose its data?
2. Why does Next.js own no authoritative progress?
3. What is the difference between owning data and rendering data?

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

### Teaching section — Application workflows

**Learning goals**

- Follow registration, account state, session refresh, administration, learning, and commerce workflows.
- Identify validation, authorization, transaction, audit, and rollback points.
- Predict safe outcomes when a step fails.

**Lesson.** Workflows are state transitions, not just page sequences. Registration creates a pending student; verification proves mailbox control; approval grants platform admission. Login creates two kinds of session material. Lesson completion rechecks access before an idempotent upsert. Checkout creates the order, immutable item rows, invoice, and entitlements atomically.

**Guided practice**

1. Draw the state of the user before and after registration, verification, approval, suspension, and restoration.
2. Trace an expired access JWT through refresh rotation and the single request retry.
3. Explain the expected response when an unverified student is approved, a locked lesson is submitted, or an owned product is purchased again.
4. For a two-product checkout, list every row created and show why one invoice contains two item lines.
5. Identify the audit event produced by each sensitive successful workflow.

**Success check.** You can state the preconditions, state changes, result, and rollback behavior for every workflow in section 5.

**Review questions**

1. Why must lesson access be checked again on completion?
2. Why is the invoice created in the checkout transaction?
3. What does refresh-token rotation prevent?

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

### Token, secret, and credential linkage

The word *token* is used in two different ways in this project: authentication tokens prove identity, while CSS design tokens define visual values. They are unrelated. Authentication tokens and secrets must never be placed in CSS, local storage, source control, logs, invoice files, or URLs except for the single-use email-verification value.

~~~mermaid
flowchart LR
    Login[Login or refresh] --> Auth[AuthService]
    Secret[JWT_SECRET environment secret] --> Sign[HS256 signer]
    Auth --> Sign
    Sign --> JWT[15-minute access JWT]
    Auth --> Refresh[14-day random refresh token]
    JWT --> Memory[AuthProvider module memory]
    Refresh --> Cookie[HttpOnly SameSite Strict cookie]
    Refresh --> Hash[SHA-256 hash in PostgreSQL]
    Memory --> Header[Authorization: Bearer JWT]
    Header --> Rewrite[Next.js /api rewrite]
    Rewrite --> Security[Spring Security resource server]
    Security --> Claims[Validate signature issuer and expiry]
    Claims --> Role[Map role claim to ROLE_*]
    Role --> Controller[Protected controller]
    Controller --> UserCheck[Reload current user or ownership from PostgreSQL]
    Cookie --> Rotate[POST /auth/refresh]
    Hash --> Rotate
    Rotate --> Auth
~~~

| Material | Created or configured by | Browser location | Server-side location | Lifetime and use | Linked code |
| --- | --- | --- | --- | --- | --- |
| Access JWT | `AuthService.createSession` signs it with HS256 | Module memory only; never local storage | Not persisted | 15 minutes by default; sent as `Authorization: Bearer ...` | `frontend/components/AuthProvider.tsx`, `backend/.../config/SecurityConfig.java` |
| Refresh token | `SecureRandom` creates 32 bytes and URL-safe Base64 encodes them | Raw value in the `enacademy_refresh` HttpOnly cookie | SHA-256 hash in `refresh_tokens` | 14 days by default; consumed and replaced on every refresh | `AuthService`, `AuthController`, `TokenRepository`, `AuthProvider` |
| Email-verification token | Registration creates the same 32-byte random form | Raw value appears once in the emailed `/verify?token=...` link | SHA-256 hash in `email_verification_tokens` | 24 hours, single use, then `used_at` prevents reuse | `AuthService`, `VerificationMailer`, `frontend/app/verify/page.tsx` |
| JWT signing secret | Operator supplies `JWT_SECRET` | Never sent to the browser | Environment/configuration only | Long-lived per environment; minimum 32 bytes; signs and verifies access JWTs | `.env`, `docker-compose.yml`, `application.yml`, `SecurityConfig` |
| Password hash | BCrypt cost 12 after registration/admin bootstrap | No password or hash is returned | `users.password_hash` | Credential verifier, not an API token | `AuthService`, `PasswordEncoder`, user repository |
| Login rate-limit key | `RateLimitService` derives a non-reversible key from email/IP context | None | Expiring Redis key such as `login:<hash>` | 15-minute protection window; not an authentication credential | `RateLimitService`, Redis |

Access JWT claims are `iss` (configured issuer), `iat`, `exp`, `sub` (user UUID), `role`, `email`, and `name`. `SecurityConfig` validates the HS256 signature, configured issuer, and expiration. It maps the `role` claim to a Spring authority such as `ROLE_ADMIN`; `/api/v1/admin/**` requires that role. Business services still reload the user or entitlement from PostgreSQL, so a valid JWT alone cannot bypass suspension, approval, invoice ownership, course ownership, or book ownership.

Refresh linkage is deliberately split: JavaScript can request `/api/v1/auth/refresh` with `credentials: 'include'`, but it cannot read the HttpOnly cookie. The browser attaches the cookie only to its `/api/v1/auth` path. The API consumes the stored hash, creates a new access JWT and refresh token, stores the new hash, and replaces the cookie. Logout revokes the hash and expires the cookie.

There is no CSRF token in the current design. Protected business requests require a bearer JWT, while the only cookie-authenticated operations are refresh/logout and the refresh cookie is SameSite Strict. Any future cross-site cookie configuration must add a fresh CSRF review. Invoice IDs, order IDs, product IDs, and lesson slugs are identifiers—not authorization tokens—and every protected lookup performs a server-side user/role/ownership check.

The application uses no payment-gateway API key, bank token, Google API key, speech API key, external invoice token, OpenAI API key, or social-login token. PostgreSQL passwords, SMTP credentials, and `JWT_SECRET` are deployment secrets rather than user session tokens; they belong in environment/secret management and never in Git.

Exact implementation links:

- [AuthService](../backend/src/main/java/com/enacademy/auth/AuthService.java) creates access, refresh, and verification tokens and hashes opaque tokens.
- [AuthController](../backend/src/main/java/com/enacademy/auth/AuthController.java) sets, rotates, and expires the refresh cookie.
- [TokenRepository](../backend/src/main/java/com/enacademy/auth/TokenRepository.java) persists and consumes verification/refresh hashes.
- [SecurityConfig](../backend/src/main/java/com/enacademy/config/SecurityConfig.java) validates JWTs, maps roles, and protects routes.
- [AuthProvider](../frontend/components/AuthProvider.tsx) holds the access JWT, adds bearer headers, refreshes once after 401, and handles protected downloads.
- [application.yml](../backend/src/main/resources/application.yml), [docker-compose.yml](../docker-compose.yml), and [.env.example](../.env.example) link token lifetimes, issuer, secret, and cookie settings into the runtime.

### Access rules

| Resource | Rule |
| --- | --- |
| Registration, verification, login, refresh, logout | Public |
| Health and API documentation | Public in current configuration |
| Curriculum summary | Public GET |
| Dashboard, lessons, words | Authenticated plus database approval check |
| Administration API | JWT role must be ADMIN |

Protected business operations reload the current account from PostgreSQL, so suspension takes effect without waiting for the access JWT to expire.

### Teaching section — Authentication and authorization

**Learning goals**

- Distinguish authentication, authorization, approval, and ownership.
- Explain passwords, access JWTs, refresh tokens, email tokens, signing secrets, and rate-limit keys.
- Trace where every credential is stored and validated.

**Lesson.** Authentication answers who the caller is; authorization answers what that identity may do. The short-lived JWT proves a signed identity and role, but database status and ownership checks still decide business access. Opaque refresh and verification tokens are useful only once and only their hashes are stored. The JWT signing secret is server configuration, not a user token.

**Guided practice**

1. Build a lifecycle table for access, refresh, and verification tokens: creation, transport, storage, expiry, consumption, and revocation.
2. Read `AuthService`, `AuthController`, `SecurityConfig`, and `AuthProvider` in that order.
3. Decode only a local development JWT payload and identify `iss`, `sub`, `role`, `iat`, and `exp`; never paste a real token into an external website.
4. Verify that refresh uses an HttpOnly SameSite cookie and that protected JSON/download requests add the bearer header.
5. Explain why an invoice UUID or lesson slug is not an authorization token.

**Success check.** You can explain why stealing a database token hash is not the same as stealing the raw token, and why a valid JWT cannot override a suspended account or missing entitlement.

**Review questions**

1. Why is the access JWT kept out of local storage?
2. What is rotated during refresh?
3. Which change would require a new CSRF design review?

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

### Teaching section — Learning system

**Learning goals**

- Understand curriculum authoring, publishing, ordering, progress, vocabulary, and speech practice.
- Explain entitlement and sequence checks.
- Recognize idempotent learning writes.

**Lesson.** Curriculum content starts as typed authoring data, becomes deterministic JSON, and is inserted by the backend seeder. Course ownership selects which level is available; completion of earlier lessons controls sequence inside that level. Progress uses a unique user/lesson row and an upsert so retries improve or preserve results instead of duplicating them.

**Guided practice**

1. Follow one lesson from `frontend/lib/curriculum.ts` to exported JSON, seeding, API response, and `LessonPlayer`.
2. Given incomplete A1 lesson 2 and a purchased A2 course, predict which first lesson in each owned level is accessible.
3. Submit the same completion conceptually with scores 70, 60, and 90; calculate the retained best score and XP behavior.
4. Save the same mixed-case word twice and explain the unique normalized result.
5. Compare browser phrase overlap with a formal pronunciation assessment.

**Success check.** You can modify curriculum safely without assuming the startup seeder overwrites existing production lessons.

**Review questions**

1. Why is the unlock query executed in PostgreSQL?
2. What makes lesson completion idempotent?
3. What privacy work is needed before adding cloud speech scoring?

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

### Teaching section — Database design

**Learning goals**

- Read the entity-relationship diagram and table safeguards.
- Choose relational columns or JSONB intentionally.
- Reason about constraints, cascades, retention, transactions, and time.

**Lesson.** The schema encodes invariants that must survive application bugs and concurrent requests. Foreign keys protect relationships, unique constraints prevent duplicates, checks limit valid values, and transactions keep multi-row workflows atomic. JSONB is reserved for flexible lesson activities; identity, ownership, money, ordering, and reporting remain relational.

**Guided practice**

1. Follow the foreign-key path from a user to an invoice and its purchased item snapshots.
2. Find the unique constraints that prevent duplicate saved words, progress, entitlements, and invoices.
3. Explain what survives if an audit actor is deleted and why user deletion is not currently exposed.
4. Compare `lessons.content` JSONB with relational `lesson_progress`.
5. Convert a stored UTC timestamp into a display timezone without changing the stored fact.

**Success check.** You can review a proposed schema change for integrity, concurrency, deletion, retention, indexing, and migration impact.

**Review questions**

1. Why are purchased titles and prices copied into order-item rows?
2. Why is money stored as whole toman?
3. Which data belongs in JSONB and which does not?

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

### API integration and linkage map

~~~mermaid
flowchart LR
    Page[Next.js page or component] -->|fetch same-origin /api/v1/...| Helper{Request type}
    Helper -- JSON --> ApiFetch[AuthProvider.apiFetch]
    Helper -- PDF/book --> ApiDownload[AuthProvider.apiDownload]
    Helper -- Public auth --> PublicFetch[Direct fetch]
    ApiFetch --> Bearer[Attach access JWT]
    ApiDownload --> Bearer
    Bearer --> Rewrite[Next.js rewrite /api/:path*]
    PublicFetch --> Rewrite
    Rewrite -->|BACKEND_URL/api/:path*| Spring[Spring Boot controllers]
    Spring --> Security[Spring Security and validation]
    Security --> Services[Domain services]
    Services --> Postgres[(PostgreSQL)]
    Services --> Redis[(Redis rate limits)]
    Services --> SMTP[SMTP or Mailpit]
    Services --> Assets[Invoice renderer and protected books]
~~~

The browser always uses relative `/api/v1/...` URLs. `frontend/next.config.ts` rewrites `/api/:path*` to `${BACKEND_URL}/api/:path*`; Docker sets `BACKEND_URL` to the internal backend service, while direct local frontend development falls back to `http://localhost:8080`. This keeps the browser on the frontend origin, allows the refresh cookie to work consistently, and avoids exposing an internal Docker hostname.

| API or integration | What it is used for | Frontend/backend linkage | Credential or token |
| --- | --- | --- | --- |
| ENAcademy REST API | Authentication, learning, administration, store, purchases, invoices, and downloads | Relative calls from pages and `AuthProvider` → Next.js rewrite → Spring controllers under `/api/v1` | Bearer access JWT on protected calls; refresh cookie only on auth refresh/logout |
| OpenAPI/Swagger UI | Interactive backend contract documentation | Springdoc exposes `/docs` and `/v3/api-docs` directly from the backend | Public in the current local configuration; no API key |
| Spring Actuator | Container and operator health checks | Docker health check and startup scripts call `/actuator/health` | Public health endpoint; no user token |
| SMTP / Mailpit | Deliver or locally capture email-verification links | `VerificationMailer` → Spring Mail configuration → `MAIL_HOST`/`MAIL_PORT` | Optional SMTP credentials in deployment secrets; verification token is message content, not an SMTP credential |
| Web Speech APIs | Lesson pronunciation playback and optional recognition | `frontend/components/LessonPlayer.tsx` calls browser `speechSynthesis` and `SpeechRecognition`/`webkitSpeechRecognition` | No ENAcademy API key; availability and remote processing depend on the user's browser |
| Google font source through `next/font` | Obtain Manrope and Vazirmatn during the frontend build | `frontend/app/layout.tsx` → Next.js font build pipeline → bundled optimized font assets | No Google API key and no runtime browser call to Google Fonts |
| PostgreSQL JDBC | Durable application data and transactions | Repository classes → Spring datasource → `DATABASE_URL` | Database username/password deployment credentials, never browser tokens |
| Redis protocol | Expiring login-rate counters | `RateLimitService` → `REDIS_HOST`/`REDIS_PORT` | Internal infrastructure connection; no user session token |
| GitHub Actions | CI for tests, type checks, builds, Compose, and containers | `.github/workflows/ci.yml` runs on push and pull request | GitHub-managed runner authorization; no application API key in source |
| Payment or banking API | Not used in the beta workflow | Checkout is approved inside `CommerceService`; no redirect or gateway client exists | No merchant key, bank token, card data, or gateway callback |
| Invoice API | Not external | `InvoicePdfService` renders the Persian PDF inside Spring from PostgreSQL snapshots | Access JWT plus ownership/ADMIN check; no invoice-service token |

#### Frontend route to backend controller

| User-facing area | Request origin | Shared client | Spring entry point |
| --- | --- | --- | --- |
| Registration and login | `/login`, `/verify` | Direct public fetch plus `AuthProvider` session methods | `AuthController` |
| Dashboard, lessons, saved words | `/dashboard`, `/learn/[lessonId]` | `apiFetch` | `LearningController` |
| Student store and purchase history | `/store`, `/purchases` | `apiFetch` and `apiDownload` | `CommerceController` |
| Student approval and audits | `/admin` | `apiFetch` | `AdminController` |
| Product/order/invoice administration | `/admin/commerce` | `apiFetch` and `apiDownload` | `CommerceAdminController` |

`apiFetch` and `apiDownload` add the in-memory bearer token, include cookies when appropriate, and perform one refresh-and-retry after a 401. `apiDownload` returns a `Blob` for invoices and books instead of attempting JSON parsing. Spring Security remains the real boundary: a frontend link or route redirect never grants authorization.

The principal API link points are [next.config.ts](../frontend/next.config.ts) for the same-origin rewrite, [AuthProvider](../frontend/components/AuthProvider.tsx) for shared authenticated requests, [AuthController](../backend/src/main/java/com/enacademy/auth/AuthController.java), [LearningController](../backend/src/main/java/com/enacademy/learning/LearningController.java), [AdminController](../backend/src/main/java/com/enacademy/admin/AdminController.java), [CommerceController](../backend/src/main/java/com/enacademy/commerce/CommerceController.java), and [CommerceAdminController](../backend/src/main/java/com/enacademy/commerce/CommerceAdminController.java) for Spring entry points.

### Error contract

The backend uses ProblemDetail responses with HTTP status, stable code, detail, and type. Validation failures also include a field-to-message map. Stable codes allow future frontend localization without parsing English text.

### Teaching section — API surface

**Learning goals**

- Use HTTP methods, paths, status codes, auth requirements, and ProblemDetail correctly.
- Trace API calls from frontend routes to Spring controllers.
- Distinguish internal APIs, browser APIs, infrastructure protocols, and absent external services.

**Lesson.** The public contract starts at `/api/v1`. GET reads, POST creates or performs a command, and PATCH changes part of a resource. Next.js rewrites same-origin `/api` requests to Spring. `apiFetch` handles JSON, `apiDownload` handles binary files, and Spring Security plus service checks decide access.

**Guided practice**

1. Open Swagger at `/docs` and group endpoints into public, authenticated student, owner-only, and ADMIN.
2. Trace one registration, dashboard, purchase, and invoice request to its controller.
3. For each request, identify request body/path values, response type, and expected failure codes.
4. Trigger a harmless validation error in local development and inspect the ProblemDetail shape.
5. Explain why Web Speech, SMTP, PostgreSQL, and Redis are integrations but the beta payment and invoice renderer are not external APIs.

**Success check.** You can add an endpoint without bypassing the shared auth client, stable error contract, validation, or controller-service-repository boundary.

**Review questions**

1. Why does a book download use `apiDownload`?
2. Where does `BACKEND_URL` take effect?
3. What must be checked beyond possession of an invoice ID?

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

#### Theme and CSS design-token linkage

~~~mermaid
flowchart LR
    Layout[app/layout.tsx defaults] --> Early[Early head script reads preferences]
    Layout --> Provider[PreferencesProvider]
    Provider --> Controls[Global language, mode, and palette controls]
    Controls --> State[locale, mode, accent state]
    State --> Storage[localStorage enacademy.preferences]
    State --> Root[html lang, dir, data-theme, data-accent]
    Root --> Globals[globals.css semantic design tokens]
    Globals --> Product[product.css component and dark-mode rules]
    Product --> Pages[Public, auth, learning, store, invoice, and admin UI]
    Fonts[next/font variables] --> Root
~~~

| Design-token group | Tokens or attributes | Defined/assigned in | Used by |
| --- | --- | --- | --- |
| Text | `--ink`, `--muted` | `frontend/app/globals.css` | Body copy, headings, labels, secondary text |
| Surfaces and borders | `--paper`, `--panel`, `--panel-soft`, `--line` | `globals.css` light/dark definitions | Page backgrounds, cards, forms, tables, dialogs, lesson and commerce panels |
| Brand/accent | `--mint`, `--mint-dark`, `--lime`, `--violet`, `--amber`, `--deep` | Base emerald palette plus `html[data-accent=...]` overrides in `globals.css` | Buttons, progress, decorative gradients, badges, focus and active states |
| Contrast-safe controls | `--solid-bg`, `--solid-fg`, `--accent-solid`, `--on-accent`, `--on-highlight` | Light/dark semantic definitions in `globals.css` | Filled buttons, active navigation, highlighted controls, and readable foreground colors |
| Typography | `--font-latin`, `--font-persian` | Created by `next/font` in `app/layout.tsx` and attached to the root class | English body uses Manrope; `html[dir=rtl]` switches to Vazirmatn |
| Mode selector | `data-theme=light|dark` | `PreferencesProvider` on `<html>` | Dark-mode overrides in `globals.css` and `product.css` |
| Palette selector | `data-accent=emerald|ocean|violet|sunset|rose` | `PreferencesProvider` on `<html>` | Palette-specific semantic color overrides |
| Language direction | `lang=en|fa`, `dir=ltr|rtl` | `PreferencesProvider` on `<html>` | Translation lookup, RTL layout, Persian font, and direction-sensitive spacing |

[app/layout.tsx](../frontend/app/layout.tsx) is the global link point: it imports [globals.css](../frontend/app/globals.css) and [product.css](../frontend/app/product.css), attaches both font variables, wraps every route in [PreferencesProvider](../frontend/components/PreferencesProvider.tsx), and mounts `PreferenceControls`. The controls update provider state; the provider writes root attributes; CSS consumes those attributes and semantic variables. Components reference semantic variables instead of owning separate theme colors, so one palette change propagates through public pages, authentication, lessons, dashboards, store, purchases, invoices, and administration.

The early inline script in `layout.tsx` reads only the non-sensitive `enacademy.preferences` JSON before React hydration and applies `lang`, `dir`, `data-theme`, and `data-accent`. This reduces a flash of the default theme. The provider validates the saved values again and ignores malformed data. On lesson routes, `PreferenceControls` adds `preference-dock-lesson`, which links to collision-safe positioning rules so the dock does not cover lesson navigation.

CSS design tokens are not authentication tokens. Theme choices never enter the access JWT, refresh cookie, PostgreSQL, Redis, or API headers, and changing theme cannot affect authorization. Conversely, authentication secrets never enter CSS or `enacademy.preferences`.

### Accessibility and resilience

- Semantic structure and labels.
- Document-level RTL.
- Desktop, tablet, and mobile layouts.
- Reduced-motion support.
- Speech fallback when browser recognition is absent.
- Accessible labels and selection state on display controls.

### Teaching section — Frontend architecture

**Learning goals**

- Understand routes, session state, localization, theme/design tokens, accessibility, and resilience.
- Trace a theme or language change across providers and CSS.
- Keep sensitive state separate from display preferences.

**Lesson.** `app/layout.tsx` is the composition root: it loads styles/fonts and mounts preference and auth providers. `AuthProvider` manages volatile session behavior. `PreferencesProvider` validates non-sensitive local preferences, updates root attributes, and supplies translations. Semantic CSS tokens allow the same components to react to mode and accent without hard-coded per-page themes.

**Guided practice**

1. Change locale, mode, and accent locally and inspect `lang`, `dir`, `data-theme`, `data-accent`, and `enacademy.preferences`.
2. Trace `--panel` from its light/dark definition to one store, lesson, and admin component.
3. Reload and confirm the early script prevents an obvious theme flash.
4. Navigate to a lesson and verify the preference dock uses its collision-safe lesson position.
5. Disable speech recognition or reduced motion and observe the fallback behavior.

**Success check.** You can add a component using semantic tokens and translated labels without storing credentials, duplicating theme colors, or breaking RTL.

**Review questions**

1. Why are design tokens unrelated to authentication tokens?
2. Which file connects all routes to both providers?
3. Why are client redirects not authorization?

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

### Teaching section — Docker and runtime architecture

**Learning goals**

- Explain service startup order, networking, health, images, endpoints, and volumes.
- Distinguish build-time and runtime dependencies.
- Operate the stack without accidentally deleting data.

**Lesson.** Compose starts infrastructure first, waits for health, then starts Spring, waits for readiness, and finally starts Next.js. Internal service names connect containers; only user/operator endpoints are published. Multi-stage builds discard compilers and caches from runtime images, while non-root users reduce container privilege.

**Guided practice**

1. Run `docker compose config --quiet` and then `./start-app.sh`.
2. Use `docker compose ps` to compare health and published ports.
3. Trace `frontend → backend → postgres/redis/mailpit` using Compose service names.
4. Read both Dockerfiles and label each stage as dependency, build, or runtime.
5. Run `./stop-app.sh`, restart, and confirm learner data remains because named volumes were preserved.

**Success check.** You can diagnose whether a startup failure belongs to infrastructure health, backend readiness, frontend health, image build, network wiring, or configuration.

**Review questions**

1. Why does the frontend wait for backend readiness?
2. Why are PostgreSQL and Redis not published?
3. What is the difference between stopping containers and removing volumes?

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

### Teaching section — Technology decisions

**Learning goals**

- Explain why each major technology fits ENAcademy.
- Discuss alternatives and tradeoffs instead of treating choices as universal.
- Connect each technology to a concrete requirement.

**Lesson.** Architecture choices are decisions under constraints. Next.js solves routing, metadata, UI, and same-origin proxying. React/TypeScript support interactive typed state. Spring/Java provide the server trust boundary, validation, security, and transactions. PostgreSQL protects relational facts; JSONB handles flexible lesson content. Redis owns disposable counters. Flyway owns schema history. Docker owns reproducibility. Mailpit makes email testable. JWT/cookies balance stateless access and revocable sessions. GitHub Actions supplies independent gates; Mermaid keeps diagrams reviewable.

**Guided practice**

1. Build a decision record with requirement, chosen technology, rejected alternatives, benefits, costs, and exit conditions.
2. Compare PostgreSQL with MongoDB, SQLite, and MySQL for identity, ordered learning, invoices, and JSON lesson content.
3. Compare explicit `JdbcClient` SQL with an ORM for the unlock query and reporting.
4. Describe when Redis failure-open is acceptable and when a gateway should fail closed.
5. Explain what complexity Docker and Spring add and what risks they remove.

**Success check.** You can defend every choice while admitting its operational cost and naming a reasonable alternative.

**Review questions**

1. Why is PostgreSQL a stronger fit than a document-only store here?
2. Why use both a short JWT and a rotating refresh token?
3. Which decision would you revisit first at very large scale?

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

### Teaching section — Security design

**Learning goals**

- Apply defense in depth across input, identity, authorization, rules, SQL, and constraints.
- Identify trust boundaries and realistic threats.
- Separate implemented controls from production requirements and known gaps.

**Lesson.** Security is a chain. Validation rejects malformed input; authentication proves identity; authorization checks role, approval, and ownership; services enforce business rules; parameterized SQL avoids injection; constraints defend persisted invariants. If any earlier layer is bypassed, later layers still matter.

**Guided practice**

1. Threat-model registration role escalation, credential stuffing, stolen refresh tokens, ID guessing, locked-lesson submission, price tampering, and invoice access.
2. For each threat, identify prevention, detection/audit, remaining risk, and a production improvement.
3. Verify that ADMIN authorization exists in Spring Security rather than only the sidebar.
4. Confirm secrets come from environment configuration and containers run non-root.
5. Turn the production-requirements list into a pre-deployment checklist with owners.

**Success check.** You can explain the impact of removing any one control and you never describe the current local defaults as production secure.

**Review questions**

1. Why are generic login errors useful?
2. What can still happen before a 15-minute JWT expires?
3. Which controls protect against a guessed invoice or product identifier?

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

### Teaching section — Observability and errors

**Learning goals**

- Distinguish health, readiness, liveness, metrics, logs, audits, and user-facing errors.
- Use stable ProblemDetail codes.
- Diagnose failures without leaking secrets or personal data.

**Lesson.** Health answers whether the service can operate; readiness answers whether it should receive traffic; liveness answers whether it should be restarted; metrics describe trends. Business errors are expected domain outcomes and use stable codes. Unexpected exceptions are operational failures and need safe logs plus correlation, not raw details in the browser.

**Guided practice**

1. Inspect `/actuator/health`, readiness, liveness, `/actuator/prometheus`, `/v3/api-docs`, and `/docs` locally.
2. Produce one validation failure, one unauthorized request, one forbidden workflow, and one conflict.
3. Record status, stable code, detail, field errors, and expected frontend behavior.
4. Design a correlation-ID path from reverse proxy to Spring logs without logging JWTs, passwords, cookies, or verification links.
5. Choose alerts for API readiness, database failure, error rate, login throttling, and checkout failure.

**Success check.** You can tell whether a failure is user-correctable, security-related, dependency-related, or a code defect and know which signal to inspect.

**Review questions**

1. Why should the frontend translate stable codes instead of parsing English detail?
2. What is the difference between an audit event and an application log?
3. Which actuator endpoints should be restricted in production?

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

### Teaching section — Development and delivery workflow

**Learning goals**

- Follow a safe local-to-GitHub delivery loop.
- Match tests and documentation to the risk of a change.
- Handle application, database, curriculum, and open-source changes differently.

**Lesson.** A focused change moves through edit, fast checks, production builds, integrated runtime verification, reviewable commit, push, and CI. Schema history is forward-only. Curriculum has an authoring/export boundary. Pull requests add owner review and automated evidence without changing the application architecture.

**Guided practice**

1. Make a documentation-only practice edit on a branch and inspect the diff.
2. For a frontend change, run tests, lint, type-check, and production build.
3. For a backend change, run Maven verification and identify whether PostgreSQL/Testcontainers are required.
4. For a schema change, draft a new migration and never edit an already-shared migration.
5. Read `.github/workflows/ci.yml` and predict which job catches each failure type.
6. Write a commit message containing the request, interpretation, changes, and verification.

**Success check.** Another developer can reproduce your change, understand why it exists, review its risks, and see independent CI evidence.

**Review questions**

1. Why must generated curriculum JSON be reviewed?
2. Why do container checks wait for frontend and backend jobs?
3. When should an owner reject a passing pull request?

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

### Teaching section — Operations and recovery

**Learning goals**

- Start, stop, back up, restore, and inspect the platform safely.
- Understand persistent-volume boundaries.
- Treat recovery as a tested procedure rather than a command copied during an incident.

**Lesson.** Normal stop removes replaceable containers and preserves durable volumes. A backup is useful only if it is recent, protected, restorable, and tested. Restore should isolate writers, load the dump, restart dependencies in order, and verify data and application health. Destructive reset is a development recovery tool, not routine maintenance.

**Guided practice**

1. Identify the exact PostgreSQL and Redis volume names and container paths.
2. Create a local PostgreSQL custom-format backup without printing credentials.
3. Record backup time, source version, checksum, encryption/storage location, and retention.
4. Restore into a disposable environment first and verify users, progress, products, orders, and invoices.
5. Write a recovery checklist for database loss, Redis loss, failed migration, and unhealthy frontend.

**Success check.** You can prove a backup restores successfully without risking the only copy of current data.

**Review questions**

1. Why is Redis recovery different from PostgreSQL recovery?
2. Why stop application writers before restore?
3. Which command permanently removes local data?

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

### Teaching section — Configuration reference

**Learning goals**

- Classify configuration as connectivity, identity bootstrap, token/security, public URL, or operation.
- Understand where Compose, Spring, and Next.js consume each value.
- Manage secrets without committing or displaying them.

**Lesson.** Configuration separates environment facts from code. Compose wires service defaults and internal names. Spring reads database, Redis, SMTP, public URL, admin, JWT, cookie, and CORS settings. Next.js reads backend and site URLs during build/runtime as appropriate. Secrets need a secret manager or protected environment; example files contain placeholders only.

**Guided practice**

1. Copy `.env.example` to a local ignored `.env` and replace placeholders with development-only values.
2. Trace `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `BACKEND_URL`, and `SITE_URL` from environment to consumer.
3. Use `docker compose config --quiet` to validate structure; do not paste expanded secret-bearing output into chat or logs.
4. Compare local HTTP cookie settings with required production HTTPS settings.
5. Build an environment matrix for local, CI, staging, and production without recording real secret values.

**Success check.** You know which values may be public, which are sensitive, which require restart/rebuild, and which component reads them.

**Review questions**

1. Why are `APP_PUBLIC_URL` and `SITE_URL` different concepts?
2. Which variables connect Next.js to Spring?
3. What fails if `JWT_ISSUER` changes while old tokens are active?

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

### Teaching section — Known limitations

**Learning goals**

- Treat limitations as explicit engineering information, not embarrassment.
- Separate product, learning, and technical gaps.
- Prioritize by risk, user value, effort, and dependency.

**Lesson.** A limitation describes a missing capability or accepted risk in the current scope. It must not be silently advertised as implemented. Security and recovery gaps usually outrank convenience. Some features, such as real payment or formal speech scoring, create legal, privacy, operational, and support obligations beyond writing code.

**Guided practice**

1. Put every limitation into a matrix: severity, probability, affected users, effort, prerequisite, and owner.
2. Mark which limitations block public production, which block scale, and which are optional enhancements.
3. Choose the first five hardening tasks and justify their order.
4. Write acceptance criteria for password reset, token cleanup, end-to-end tests, and audit retention.
5. Explain why browser speech overlap must not be marketed as pronunciation certification.

**Success check.** Roadmap decisions are tied to explicit risks and outcomes rather than feature excitement alone.

**Review questions**

1. Which current limitation is most dangerous for a public deployment?
2. Which limitations require policy or legal decisions?
3. When should a limitation become a documented non-goal instead?

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

### Teaching section — Recommended roadmap

**Learning goals**

- Convert roadmap themes into ordered, testable delivery increments.
- Recognize dependencies between hardening, infrastructure, learning depth, and open-source work.
- Define completion with evidence.

**Lesson.** The phases are intentionally ordered. Hardening reduces immediate risk. Managed infrastructure makes operations dependable. Learning depth adds educational value after the foundation is trustworthy. Open-source readiness makes outside contribution safe and understandable. Some work can overlap, but production exposure should not outrun security and recovery.

**Guided practice**

1. Turn each Phase 1 bullet into a small issue with motivation, scope, acceptance criteria, tests, documentation, and rollback.
2. Draw dependencies such as HTTPS → secure cookies, managed database → backup/PITR drills, or public contributions → branch protection and templates.
3. Assign outcome metrics: recovery time, error rate, token cleanup age, accessibility results, or curriculum mastery.
4. Create a milestone that fits one release instead of implementing an entire phase at once.
5. Revisit known limitations after each milestone and update both lists.

**Success check.** Every roadmap item has a reason, owner, dependency, measurable definition of done, and evidence plan.

**Review questions**

1. Why does hardening precede learning expansion for public production?
2. Which roadmap items reduce operational risk most?
3. What minimum files and policies are needed before opening contributions?

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

### Teaching section — Repository map

**Learning goals**

- Navigate from a user behavior to frontend, backend, database, test, configuration, and documentation files.
- Know where new code belongs.
- Avoid creating duplicate sources of truth.

**Lesson.** Navigate by responsibility, not file-name guessing. Routes live in `frontend/app`; reusable browser behavior lives in `frontend/components`; curriculum and translations live in `frontend/lib`. Spring packages follow domains such as auth, learning, commerce, admin, config, and shared behavior. Resources hold migrations, curriculum JSON, protected books, fonts, and configuration. Root files define delivery and operation.

**Guided practice**

1. Locate the full path for login, lesson completion, purchase checkout, invoice rendering, theme switching, and student approval.
2. For each behavior, identify its page/component, controller, service, repository, migration/table, and test.
3. Find where the API proxy, Docker topology, CI workflow, start script, and environment examples live.
4. Decide where you would add password reset, a new product type, an additional lesson activity, and an operations runbook.
5. Update this map whenever a new top-level responsibility appears.

**Success check.** Starting from any screen or API endpoint, you can find the authoritative implementation and its supporting tests/configuration without searching the entire repository.

**Review questions**

1. Where should a new business rule live?
2. Which files are generated and which are authored?
3. When does a new folder deserve an entry in the repository map?

## Related documents

- [README](../README.md)
- [Architecture summary](architecture.md)
- [Database operations](database.md)
- [Security checklist](security.md)
- [Contribution guide](../CONTRIBUTING.md)

---

Update this guide whenever a service, trust boundary, database table, authentication rule, deployment dependency, or major learning workflow changes. Documentation is part of the system. If it disagrees with the code, the code is current behavior and the guide must be corrected in the same change.
