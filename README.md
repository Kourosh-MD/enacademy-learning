# ENAcademy

ENAcademy is a production-shaped English learning platform with a complete A1–A2 path, interactive lesson activities, durable learner progress, and an administrator approval workflow.

The public experience has a polished responsive landing page, 3D motion, an about page, and a transparent curriculum. The application layer is a Next.js client backed by a Spring Boot API, PostgreSQL, Redis, and local email delivery through Mailpit.

## Run the full platform

Requirements: Docker Engine with Docker Compose.

```bash
./start-app.sh
```

The script builds the images, starts every service in the background, and waits for the stack to become healthy. Without a `.env` file it uses the local-only defaults in `docker-compose.yml`. To customize credentials, copy `.env.example` to `.env` before starting; replace every placeholder before deployment.

To stop the application without deleting learner data:

```bash
./stop-app.sh
```

The equivalent manual workflow is `docker compose up --build --detach --wait` and `docker compose down`.

Then open:

- Web application: http://localhost:3000
- API documentation: http://localhost:8080/docs
- Mailpit inbox: http://localhost:8025
- Health endpoint: http://localhost:8080/actuator/health

The administrator account comes from `APP_ADMIN_EMAIL` and `APP_ADMIN_PASSWORD`. The values in `.env.example` are placeholders and must be changed outside local development.

## Student workflow

1. A student creates an email/password account.
2. ENAcademy sends a one-time verification link (visible in Mailpit locally).
3. The verified profile enters the administrator queue.
4. An administrator approves, rejects, or suspends the profile.
5. An approved student completes lessons in order; scores, XP, saved words, and progress persist in PostgreSQL.

## Repository layout

```text
frontend/   Next.js 16, React 19, TypeScript
backend/    Spring Boot 4, Java 21, Maven, Flyway
docs/       Architecture and security decisions
scripts/    Deterministic curriculum export
```

The curriculum is authored in `frontend/lib/curriculum.ts`. Run `make curriculum` after editing it to regenerate the backend seed resource.

## Local development

Infrastructure only:

```bash
docker compose up postgres redis mailpit
```

Backend:

```bash
cd backend
./mvnw spring-boot:run
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

## Quality gates

```bash
make test
docker compose config --quiet
docker compose build
```

GitHub Actions repeats the backend tests, frontend lint/type/build checks, Compose validation, and production image builds on every pull request.

Start with the [Complete system guide](docs/system-guide.md) for product workflows, architecture diagrams, data design, security, technology decisions, operations, and the roadmap. See also [Architecture](docs/architecture.md), [Database guide](docs/database.md), [Security](docs/security.md), and [Contributing](CONTRIBUTING.md).
