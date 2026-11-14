# Architecture

## 1. Status

Phase 00 establishes the repository, local infrastructure, backend, frontend, and verification pipelines. Phase 01 adds the domain schema, JPA entities, repositories, and shared DTO foundation. Authentication, uploads, moderation workflows, and public endpoints are implemented in later phases.

## 2. Architectural style

The system is a **modular monolith**:

- One Spring Boot backend organized by business domain.
- One React single-page application organized by feature.
- One PostgreSQL database.
- Cloudinary for image storage and delivery.
- No microservices, message broker, Redis, or Elasticsearch in the initial architecture.

This keeps deployment and operations simple while preserving clear module boundaries.

## 3. System context

```mermaid
flowchart LR
    Browser[Browser] -->|HTTPS| Web[React SPA on Vercel]
    Web -->|"/api/* rewrite"| API[Spring Boot API on Render]
    Browser -->|"signed direct upload"| Cloudinary[Cloudinary]
    API -->|"verify, administer"| Cloudinary
    API -->|"JDBC"| DB[(PostgreSQL on Neon)]
    API -->|"SMTP/API"| Email[Email provider]
    Web -->|"image delivery"| Cloudinary
```

### Request path

- Development: browser → Vite dev server (`:5173`) → `/api` proxy → Spring Boot (`:8080`).
- Production: browser → Vercel → `/api/*` rewrite → Render → Neon.
- Cloudinary uploads go directly from the browser to Cloudinary; image bytes do not pass through Spring Boot.

## 4. Backend modules

```text
com.gecarchive
├── auth
├── user
├── event
├── album
├── photo
├── moderation
├── category
├── contributor
├── report
├── analytics
├── audit
├── common
└── GecArchiveApplication
```

Each domain uses only the layers it needs:

- `controller`
- `service`
- `repository`
- `entity`
- `dto`
- `mapper`
- `validation`

Controllers handle HTTP concerns, validation, and authorization annotations. Services own business rules and transaction boundaries. Repositories use Spring Data JPA. DTOs define the API contract; entities never cross the HTTP boundary.

## 5. Frontend structure

```text
src/
├── app/            application shell, router, providers
├── components/     shared presentation components
├── features/       feature folders such as archive, events, albums, photos, auth, contributions, admin
├── lib/            API client, configuration, utilities
├── styles/         global styles and design tokens
└── test/           test setup and shared helpers
```

Features own their components, hooks, schemas, and tests. Shared components remain generic and presentation-focused.

## 6. Authentication and session model

The proposed production model:

- Access token: short-lived JWT, kept in memory only.
- Refresh token: opaque random token, hashed at rest, rotated on use, delivered in a secure `HttpOnly` cookie.
- Refresh-token reuse detection revokes the token family.
- Cookie-authenticated endpoints are protected against CSRF.
- Production uses a same-origin `/api` rewrite so refresh cookies remain first-party.
- No long-lived secrets in `localStorage`.

The full design is finalized in Phase 02 and recorded in `docs/DECISIONS.md`.

## 7. Upload flow

1. User selects photographs.
2. Frontend validates count, size, and MIME type.
3. Frontend requests upload authorization.
4. Backend authenticates the user and creates a short-lived upload authorization.
5. Backend returns signed Cloudinary parameters.
6. Frontend uploads directly to Cloudinary.
7. Frontend submits the asset identifiers and metadata.
8. Backend verifies the asset with trusted Cloudinary APIs.
9. Backend verifies ownership and matching upload authorization.
10. Backend creates pending photo records.
11. Administrators moderate the submission.

Key rules:

- Never trust client-provided URLs, public IDs, dimensions, or MIME types.
- Pending assets must not be publicly reachable.
- Abandoned uploads expire and are cleaned up.
- Original images are exposed only where permitted.
- EXIF location data is not published.

## 8. Moderation architecture

- Current photo status is stored on `photo` for fast queries.
- Full moderation history is append-only.
- Transitions are enforced by the service layer.
- Optimistic locking and conditional updates prevent conflicting actions.
- Public visibility is a single, tested predicate combining photo, album, event, and soft-delete state.
- Administrative actions produce audit records.

## 9. Cross-cutting concerns

| Concern | Approach |
|---|---|
| API versioning | `/api/v1` |
| Error format | RFC 9457 `ProblemDetail` |
| Validation | Jakarta Bean Validation in DTOs |
| Time | UTC everywhere; `timestamptz` in PostgreSQL |
| IDs | UUID primary keys |
| Deletion | Soft delete/archival for published content; restrictive foreign keys |
| Logging | Structured, no secrets or unnecessary personal data |
| Observability | Spring Boot Actuator health/info; hosted platform logs and uptime checks |
| Caching | HTTP caching for public reads; React Query client cache; no Redis initially |
| Configuration | Environment variables; dev profile only for local defaults |

## 10. Deployment topology

| Environment | Frontend | Backend | Database | Images | Email |
|---|---|---|---|---|---|
| Local | Vite `:5173` | Spring Boot `:8080` | Docker PostgreSQL 17 | Cloudinary test account | Mailpit |
| Production | Vercel | Render | Neon PostgreSQL | Cloudinary | Production SMTP/API provider |

The production API is reached through a Vercel `/api/*` rewrite so browser cookies remain first-party.

## 11. Version policy

- Backend dependencies are managed by the Spring Boot BOM, with explicit versions only where required.
- Frontend dependencies are pinned exactly in `package.json` and locked in `package-lock.json`.
- Major framework upgrades require an ADR and a verification pass.
- TypeScript is pinned to a version supported by the current TypeScript ESLint toolchain.

See `docs/DECISIONS.md` for the accepted version matrix and rationale.

## 12. Phase boundaries

| Phase | Architectural output |
|---|---|
| 00 | Repository, toolchains, local infrastructure, security baseline |
| 01 | Database schema, entities, repositories, DTO foundation, API docs |
| 02 | Authentication, four-role authorization, ownership checks |
| 03 | Events, albums, academic years, categories, public archive APIs |
| 04 | Signed Cloudinary uploads, verification, variants, cleanup |
| 05 | Moderation, reports, event suggestions, audit logs |
| 06 | Frontend design system, navigation, API client, routing |
| 07 | Public website |
| 08 | User dashboard |
| 09 | Admin dashboard |
| 10 | Unit, integration, E2E, security, and performance verification |
| 11 | Production deployment and launch |
