# Architecture Decision Records

## Format

Each record contains:

- **Status:** Proposed, Accepted, Superseded, or Rejected
- **Context:** The problem and constraints
- **Decision:** What was chosen
- **Consequences:** Trade-offs and follow-up work

## Index

| ID | Title | Status |
|---|---|---|
| ADR-0001 | Modular monolith and monorepo | Accepted |
| ADR-0002 | Initial dependency/version matrix | Accepted |
| ADR-0003 | Four-role model with GUEST as an unauthenticated state | Accepted |
| ADR-0004 | Same-origin API proxy and cookie-based refresh tokens | Proposed |
| ADR-0005 | UUID keys, UTC timestamps, soft deletion, and append-only audit | Accepted |
| ADR-0006 | Uploader/photographer separation and event-album-photo integrity | Accepted |
| ADR-0007 | Constrained varchar enums instead of PostgreSQL enum types | Accepted |
| ADR-0008 | Photo-level moderation with submission batches | Accepted |
| ADR-0009 | Administrator-managed albums and approval-time album assignment | Accepted |
| ADR-0010 | Database-enforced append-only moderation and audit tables | Accepted |
| ADR-0011 | Administrator-managed contributor profiles | Accepted |
| ADR-0012 | Soft-delete retention and separated removal requests | Accepted |
| ADR-0013 | Short-lived JWT access tokens with rotating opaque refresh cookies | Accepted |
| ADR-0014 | Cookie CSRF tokens and Origin validation | Accepted |
| ADR-0015 | Single-use hashed email verification and password reset tokens | Accepted |
| ADR-0016 | Environment bootstrapped SUPER_ADMIN with forced password rotation | Accepted |
| ADR-0017 | Archive lifecycle and public visibility boundary | Accepted |

---

## ADR-0001 — Modular monolith and monorepo

**Status:** Accepted

### Context

The archive is a single product with a small team, modest traffic expectations, and strong domain relationships between users, events, albums, photos, moderation, and audit data. Microservices would add deployment, observability, and consistency costs without a demonstrated need.

### Decision

- Use one Spring Boot backend organized by business domain.
- Use one React single-page application organized by feature.
- Keep both applications in one repository with separate build roots (`backend/`, `frontend/`).
- Use one PostgreSQL database.
- Do not introduce a message broker, Redis, Elasticsearch, or Kubernetes initially.

### Consequences

- Simple local development and deployment.
- Clear module boundaries without distributed transactions.
- Domain modules can later be extracted if a real scaling requirement appears.
- CI must build and test both applications.

---

## ADR-0002 — Initial dependency/version matrix

**Status:** Accepted

### Context

Spring Boot 4.x is a new major line with Jackson 3, JUnit 6, Hibernate 7, Spring Security 7, and Testcontainers 2. Many third-party examples still target Spring Boot 3 and will not compile. Frontend "latest" versions also have incompatible peer requirements.

### Decision

Backend:

- Java 21
- Spring Boot 4.1.2
- Spring Framework 7.0.10 (managed)
- Spring Security 7.1.2 (managed)
- Hibernate 7.4.13.Final (managed)
- Flyway 12.4.0 plus `flyway-database-postgresql`
- PostgreSQL JDBC 42.7.14
- springdoc-openapi 3.2.0
- JUnit Jupiter 6.0.3
- Mockito 5.23.0
- Testcontainers 2.0.5

Frontend:

- Node.js 24.22.3 LTS
- React 19.3.1
- Vite 8.3.8
- `@vitejs/plugin-react` 6.3.0
- TypeScript 6.0.3
- Tailwind CSS 4.3.5
- React Router 8.5.1
- TanStack Query 5.107.1
- React Hook Form 7.92.0
- Zod 4.6.7
- Vitest 5.1.0
- React Testing Library 16.3.3
- jsdom 31.0.1
- ESLint 10.15.0
- typescript-eslint 8.72.2

Infrastructure:

- PostgreSQL 17.12
- Mailpit 1.33.1
- Docker Compose

### Consequences

- springdoc 3.2.0 is built against Spring Boot 4.1.2 exactly.
- TypeScript 7 is intentionally not used because the current `typescript-eslint` supports versions below 6.1.
- Node 24 is required for React Router 8, Vitest 5, and jsdom 31.
- Testcontainers 2 uses new artifact names and packages; older examples must not be copied blindly.
- Major upgrades require verification and a new ADR.

---

## ADR-0003 — Four-role model with GUEST as an unauthenticated state

**Status:** Accepted

### Context

The product requires exactly four roles but also states that `GUEST` is an unauthenticated security state, not necessarily a database user. Persisting `GUEST` on user rows would create an invalid account state and complicate constraints.

### Decision

- Define a `Role` enum containing `GUEST`, `USER`, `ADMIN`, and `SUPER_ADMIN`.
- Persist only `USER`, `ADMIN`, and `SUPER_ADMIN` in the `users` table.
- Enforce the persisted role set with a database check constraint.
- Treat requests without an authenticated principal as `GUEST`.
- Never assign `GUEST` to a database user.

### Consequences

- The authorization model exposes exactly four roles.
- The database cannot contain a guest account.
- Permission checks must explicitly handle anonymous access.
- Role transitions remain auditable and constrained.

---

## ADR-0004 — Same-origin API proxy and cookie-based refresh tokens

**Status:** Accepted — implemented in Phase 02

### Context

The frontend is deployed on Vercel and the API on Render. Cross-site refresh cookies are fragile, especially in Safari and other browsers with strict third-party cookie policies. Storing refresh tokens in `localStorage` would expose them to XSS.

### Decision

- Serve the API to the browser through a same-origin `/api/*` rewrite on Vercel.
- In development, proxy `/api` through Vite to the backend.
- Keep short-lived access tokens in memory.
- Deliver rotating refresh tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies with no `Domain` attribute.
- Protect cookie-authenticated endpoints with CSRF tokens and Origin validation.

### Consequences

- Refresh cookies remain first-party.
- Production CORS surface is reduced.
- The API hostname must be known to the Vercel rewrite configuration.
- Preview deployments need a deliberate API target strategy.
- Cookies must not set a `Domain` attribute or the proxy benefit is lost.

### Alternatives considered

- Cross-site cookies with `SameSite=None`: rejected because of browser restrictions and added CSRF/CORS complexity.
- Refresh token in `localStorage`: rejected because of XSS risk.
- Backend-for-frontend service: deferred as unnecessary complexity for the initial scope.

---

## ADR-0005 — UUID keys, UTC timestamps, soft deletion, and append-only audit

**Status:** Accepted

### Context

The archive preserves institutional history. Records must remain stable across exports, imports, moderation changes, and account deactivation. Destructive deletes would break attribution and audit history.

### Decision

- Use UUID primary keys.
- Store timestamps as `timestamptz` in UTC.
- Use `deleted_at` or archival status for published content.
- Default foreign keys to `ON DELETE RESTRICT`.
- Avoid cascading deletion of published content and audit history.
- Deactivate or anonymize users rather than hard-deleting them while attribution must remain.
- Keep moderation history and audit logs append-only.

### Consequences

- Stable identifiers for public links and exports.
- Historical attribution and moderation records survive account changes.
- Queries must consistently exclude soft-deleted content.
- Unique constraints may require partial indexes.
- Data retention and anonymization policies must be documented.

---

## ADR-0006 — Uploader/photographer separation and event-album-photo integrity

**Status:** Accepted

### Context

Uploaders are not necessarily photographers. A single photograph may have multiple photographers. The product also requires photos to belong to albums and albums to belong to events, while submissions may be uploaded before an album is assigned.

### Decision

- Store `photos.uploaded_by_user_id` as the accountable uploader.
- Store photographer attribution in a `photo_photographers` join table linked to `contributor_profiles`.
- Allow free-text credit names when no profile exists.
- Never derive photographer from uploader.
- Require `photos.event_id` as the target event.
- Allow `photos.album_id` to be null while pending.
- Require `album_id` for approved photos.
- Enforce event consistency with a composite foreign key from photo to album.
- Group uploads in a `photo_submissions` batch to enforce per-submission limits and support tracking.
- Keep moderation history append-only and current status denormalized for fast public queries.

### Consequences

- Accurate attribution and support for multiple photographers.
- Pending photos can exist without an album.
- The schema is more complex than a single uploader/photographer column.
- The Phase 01 ERD must verify all constraints and indexes before entities are written.
- Moderation and public-visibility queries must join across photo, album, and event state.

---

## ADR-0007 — Constrained varchar enums instead of PostgreSQL enum types

**Status:** Accepted

### Context

Roles, moderation states, report states, and submission states will change as the product matures. PostgreSQL enum types require `ALTER TYPE` migrations and can be awkward to remove or reorder. Hibernate mapping and SQL exports are also simpler with text values.

### Decision

- Store enumerations in constrained `varchar` columns.
- Pair every column with a `CHECK` constraint listing allowed values.
- Map values to Java enums with `@Enumerated(EnumType.STRING)`.
- Keep `GUEST` in the application enum but exclude it from the users role constraint.

### Consequences

- Enum additions require a forward-only migration and a matching Java constant.
- Values are readable in SQL, logs, and exports.
- Invalid values are rejected by the database as well as the application.
- The database does not enforce ordering or a separate enum type.

---

## ADR-0008 — Photo-level moderation with submission batches

**Status:** Accepted

### Context

The PRD defines moderation states per photograph and lets administrators approve or reject individual photographs. Uploads also need a batch concept for the 50-photo limit, progress tracking, and grouped metadata.

### Decision

- Store moderation state and history per photo.
- Use `photo_submissions` as a grouping and tracking aggregate.
- Never make the batch status the authority for public visibility.
- Allow bulk moderation actions in the UI by applying per-photo transitions.

### Consequences

- A single batch can contain approved and rejected photographs.
- Every photo has its own auditable transition history.
- Batch progress is derived and may briefly lag the individual photos.
- Administrators can process submissions incrementally.

---

## ADR-0009 — Administrator-managed albums and approval-time album assignment

**Status:** Accepted

### Context

Users contribute photographs to events, but the public archive requires every published photo to belong to an album. Allowing contributors to create albums directly would multiply moderation and taxonomy work. Pending photos may not yet have a suitable album.

### Decision

- Administrators create, publish, and archive albums.
- Users may select an existing album during submission or leave it unset.
- `photos.album_id` remains nullable while pending.
- Approval requires a non-null album from the same event, enforced by a check constraint and a composite foreign key.
- Events may exist without any albums.

### Consequences

- Moderators must assign or confirm an album before approval.
- The archive taxonomy stays controlled and consistent.
- Pending photos can be grouped by event without blocking uploads.
- Future album-proposal workflows require a new decision.

---

## ADR-0010 — Database-enforced append-only moderation and audit tables

**Status:** Accepted

### Context

Moderation history and audit logs are evidence. Application-only discipline is insufficient if a bug, migration, or manual operation can rewrite history.

### Decision

- Create `photo_moderations` and `audit_logs` as append-only tables.
- Add database triggers that reject `UPDATE`, `DELETE`, and `TRUNCATE`.
- Keep current photo state in `photos`; history remains immutable.

### Consequences

- Corrections are recorded as new rows rather than edits.
- Test and operational tooling cannot truncate these tables casually.
- Database migrations that need to change history structure require a deliberate, documented procedure.

---

## ADR-0011 — Administrator-managed contributor profiles

**Status:** Accepted

### Context

Photographer attribution must be accurate, but self-service claiming introduces identity-verification and impersonation risks. The initial archive is expected to be curated by a small administrator team.

### Decision

- Create and edit contributor profiles through administrative workflows.
- Allow an optional one-to-one link from a contributor profile to a user account.
- Never derive a photographer from the uploader.
- Defer self-service claiming and profile editing.

### Consequences

- Attribution remains curated and auditable.
- Users who are photographers need an administrator to create or link their profile.
- Claiming can be added later without changing the core tables.

---

## ADR-0012 — Soft-delete retention and separated removal requests

**Status:** Accepted

### Context

Removed or rejected content must disappear publicly but remain available for audit, attribution, and dispute resolution. Reports and owner takedown requests also have different workflows and reporting needs.

### Decision

- Retain metadata for rejected and removed photographs.
- Use `photos.deleted_at` plus moderation status for removal; public queries exclude both.
- Keep reports in `photo_reports` and owner takedown requests in `photo_removal_requests`.
- Delete Cloudinary assets only under the retention procedure defined in Phase 04.
- Prevent hard deletion of users, events, albums, and photos while attribution or audit references remain.

### Consequences

- Historical moderation and attribution survive removal.
- Public and private visibility must be tested separately.
- Storage cleanup is a deliberate Phase 04 concern, not a database cascade.
- Reports and removal requests can be analyzed independently.

---

## ADR-0013 — Short-lived JWT access tokens with rotating opaque refresh cookies

**Status:** Accepted

### Context

The SPA needs stateless authorization for API calls without exposing long-lived credentials to JavaScript. Refresh credentials must survive page reloads, resist XSS, and support immediate revocation on security events.

### Decision

- Issue HS256 JWTs with a 15-minute TTL and only the claims `sub`, `role`, `jti`, `iss`, `iat`, `exp`.
- Keep access tokens in frontend memory; never in `localStorage` or `sessionStorage`.
- Issue opaque 256-bit refresh tokens, store only their SHA-256 hashes, and rotate on every refresh.
- Group rotations into a family with an absolute 30-day deadline and a 7-day idle expiry.
- Deliver the refresh token in an `HttpOnly`, `SameSite=Lax`, `Secure` (outside development) cookie scoped to `/api/v1/auth`.
- Detect reuse of a rotated token and revoke the entire family.
- Reload the user, role, and status from PostgreSQL on every authenticated request so revocation does not wait for token expiry.

### Consequences

- Access-token validation stays stateless and fast.
- A stolen refresh token can be used at most once before reuse detection fires.
- One extra database read occurs per authenticated request, accepted for immediate suspension semantics.
- The HMAC secret must be at least 32 bytes and rotated deliberately; rotating it invalidates all access tokens.
- Distributed deployments must share the same secret.

---

## ADR-0014 — Cookie CSRF tokens and Origin validation

**Status:** Accepted

### Context

Refresh and logout authenticate with a cookie, which browsers attach automatically. Without CSRF protection, a third-party page could trigger session rotation or logout.

### Decision

- Use Spring Security's `CookieCsrfTokenRepository` with a readable `XSRF-TOKEN` cookie and `X-XSRF-TOKEN` header.
- Require CSRF for refresh, logout, and any future cookie-authenticated state-changing request.
- Ignore CSRF only for the unauthenticated auth flows (register, verify, resend, login, forgot, reset).
- Reject state-changing `/api/**` requests whose `Origin` is present but not in the configured allowlist.
- Keep CORS to an explicit credentialled origin allowlist.

### Consequences

- Cross-site requests cannot rotate or revoke sessions.
- The frontend must read the `XSRF-TOKEN` cookie and echo it in the header.
- Requests without an `Origin` header remain possible for non-browser clients; CSRF still applies where relevant.
- Same-origin deployment through the `/api` rewrite keeps the cookies first-party.

---

## ADR-0015 — Single-use hashed email verification and password reset tokens

**Status:** Accepted

### Context

Email verification and password reset require bearer values that travel through email, a channel that may be logged or forwarded. Long-lived or reusable tokens increase account-takeover risk.

### Decision

- Generate 256-bit opaque tokens and store only SHA-256 hashes in `auth_tokens`.
- Record purpose (`EMAIL_VERIFICATION` or `PASSWORD_RESET`), expiry, and `used_at`.
- Verification tokens expire after 24 hours; reset tokens after 1 hour.
- Invalidate previous unused tokens of the same purpose when a new one is issued.
- Return generic `202` responses so account existence is not revealed.
- Revoke all refresh sessions after a successful password reset.

### Consequences

- Email links are single-use and short-lived.
- A database leak does not expose usable tokens.
- Resending invalidates older links, which is intentional.
- Delivery failures must not change the API response; SMTP errors are logged without recipient details.

---

## ADR-0016 — Environment bootstrapped SUPER_ADMIN with forced password rotation

**Status:** Accepted

### Context

The system needs an initial privileged account without committing credentials or shipping a default password. The bootstrap must be safe to run repeatedly and auditable.

### Decision

- Read the bootstrap email, password, and display name from environment variables.
- Skip bootstrap when any active SUPER_ADMIN already exists or the email is already registered.
- Validate the bootstrap password against the normal policy.
- Mark the account active and verified, and set `password_change_required=true`.
- Record `SUPER_ADMIN_BOOTSTRAPPED` in `audit_logs`.
- Block all endpoints except profile read, password change, CSRF, refresh, and logout until the password is changed.

### Consequences

- No credentials are stored in the repository.
- The first deployment requires deliberate secret configuration.
- The bootstrap account cannot operate normally until its password is rotated.
- Removing the environment variables after bootstrap leaves no privileged backdoor.

---

## ADR-0017 — Archive lifecycle and public visibility boundary

**Status:** Accepted

### Context

Events and albums are editorial records. Administrators need to prepare unpublished records, while public visitors must never see drafts, archived records, or photos belonging to unpublished parents.

### Decision

- Academic years and categories are administrator-managed reference data.
- Events belong to one academic year and one category; an event date must fall within the academic-year date range.
- Albums belong to one event and have independent publication and archive state.
- Event and album slugs are normalized to lowercase ASCII kebab case and must be globally unique.
- Event and album archival is a soft-delete operation: publication is disabled and `deleted_at` is set.
- Public reads use dedicated DTOs and repositories/services, never entities.
- Public event results require `published=true` and `deleted_at IS NULL`.
- Public album results require the same album predicate plus a published, non-deleted event.
- Public photos require approved status, no deletion, and both published, non-deleted parents.
- Administrative archive writes are restricted to `ADMIN` and `SUPER_ADMIN` and create audit records.

### Consequences

- Editorial drafts can be prepared without leaking to guests.
- Retained records preserve references for future audit and attribution.
- Every public photo query must preserve the shared visibility predicate.
- Categories are deactivated rather than deleted; academic years can only be deleted when foreign-key dependencies permit it.
- Upload and moderation state transitions remain Phase 04/05 responsibilities.
