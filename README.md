# GEC Sheikhpura Archive

A community-driven digital photography archive for Government Engineering College, Sheikhpura, Bihar.

The archive preserves college events, photographs, albums, and contributor credits in one public, moderated platform. Registered contributors submit photographs; administrators review submissions before publication.

> **Status:** Phase 01 — data foundation complete. The domain schema, entities, and repositories exist. Public endpoints, authentication, uploads, and moderation workflows are not implemented yet.

## Product principles

1. Preserve institutional memories.
2. Present photographs with editorial care.
3. Keep community contributions reliable and attributable.
4. Protect privacy and enforce strong moderation.
5. Prefer simple, maintainable architecture over unnecessary infrastructure.

## Technology

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod |
| Backend | Java 21, Spring Boot 4.1, Spring Security, Spring Data JPA, Flyway, Maven |
| Database | PostgreSQL 17 |
| Images | Cloudinary (signed direct uploads; server-side verification) |
| Frontend tests | Vitest, React Testing Library, Playwright |
| Backend tests | JUnit 5/6, Mockito, Spring Boot Test, Testcontainers, MockMvc |
| Local infrastructure | Docker Compose |
| Deployment | Vercel (frontend), Render (backend), Neon (PostgreSQL), Cloudinary (images) |

## Repository layout

```text
gecs-archive/
├── .github/            CI workflow, Dependabot, pull request template
├── backend/            Spring Boot API
├── frontend/           React single-page application
├── docs/               Product, architecture, database, API, security, deployment notes
├── compose.yaml        Local PostgreSQL and Mailpit
├── AGENTS.md           Engineering and AI-agent working rules
└── README.md
```

## Prerequisites

| Tool | Version |
|---|---|
| Java | 21 (Temurin or OpenJDK) |
| Maven | 3.9.x (use the Maven wrapper) |
| Node.js | 24.22.3 LTS |
| npm | 11.x |
| Docker Desktop | Current, with Compose v2 |
| Git | Current |

The project pins Node in `.nvmrc` and Java through the Maven build. Use Java 21 for local runs so local behavior matches the production runtime.

### Java 21 on macOS

If Java 21 is not installed:

```bash
brew install openjdk@21
mkdir -p "$HOME/Library/Java/JavaVirtualMachines"
ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk \
  "$HOME/Library/Java/JavaVirtualMachines/openjdk-21.jdk"
```

Then, in each shell used for backend commands:

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

### Node.js 24

```bash
nvm install 24.22.3
nvm use
```

## Local quickstart

### 1. Start infrastructure

```bash
docker compose up -d
docker compose ps
```

Services:

| Service | Address |
|---|---|
| PostgreSQL | `localhost:5432` |
| Mailpit SMTP | `localhost:1025` |
| Mailpit UI | http://localhost:8025 |

Optional local overrides can be placed in `.env` (copy from `.env.example`). Never commit `.env`.

### 2. Start the backend

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The API starts at http://localhost:8080. Health:

```bash
curl -s http://localhost:8080/actuator/health
```

OpenAPI documentation is enabled only in the `dev` profile:

- http://localhost:8080/v3/api-docs
- http://localhost:8080/swagger-ui.html

### 3. Start the frontend

```bash
cd frontend
npm ci
npm run dev
```

The frontend starts at http://localhost:5173. Vite proxies `/api` to the backend at `http://localhost:8080`.

## Common commands

### Backend

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
cd backend
./mvnw -B verify
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

### Infrastructure

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres
docker compose down
```

To remove the local database volume as well:

```bash
docker compose down -v
```

## Verification

Run the same checks locally that GitHub Actions runs on every push and pull request:

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
cd backend && ./mvnw -B verify

cd ../frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

The backend integration tests use Testcontainers and require Docker Desktop. The frontend unit and component tests run in jsdom through Vitest.

CI is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Dependency updates are proposed weekly by Dependabot, and the pull request checklist is in [`.github/pull_request_template.md`](.github/pull_request_template.md).

## Configuration and secrets

- Local database defaults live only in the `dev` Spring profile.
- Production configuration is supplied through environment variables by Render, Vercel, and Neon.
- No credentials, JWT signing keys, Cloudinary secrets, or database URLs are committed.
- Frontend environment variables must be public by definition; never place secrets in `VITE_*` variables.
- See `docs/SECURITY.md` for the full security model.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product requirements and scope
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture
- [`docs/DATABASE.md`](docs/DATABASE.md) — database conventions and integrity rules
- [`docs/API.md`](docs/API.md) — API conventions and contracts
- [`docs/SECURITY.md`](docs/SECURITY.md) — authentication, authorization, upload, privacy rules
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — environments and deployment
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architecture decision records
- [`AGENTS.md`](AGENTS.md) — engineering workflow and agent rules

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 00 | Project setup and toolchains | Complete |
| 01 | Database and backend foundation | Complete |
| 02 | Authentication and authorization | Not started |
| 03 | Archive management | Not started |
| 04 | Image upload | Not started |
| 05 | Moderation | Not started |
| 06 | Frontend foundation | Not started |
| 07 | Public website | Not started |
| 08 | User dashboard | Not started |
| 09 | Admin dashboard | Not started |
| 10 | Quality assurance | Not started |
| 11 | Production deployment | Not started |

## Git conventions

Use focused commits with conventional messages, for example:

```text
feat(auth): implement user registration
fix(moderation): prevent duplicate approvals
docs(architecture): update database relationships
```

Do not commit secrets. Do not force-push `main`. Do not perform destructive Git operations without approval.

## License

To be decided by the project owner.
