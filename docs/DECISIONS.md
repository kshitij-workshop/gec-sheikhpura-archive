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
| ADR-0018 | Server-bound signed Cloudinary uploads and trusted verification | Accepted |
| ADR-0019 | Moderation transition table and derived submission status | Accepted |
| ADR-0020 | In-memory SPA sessions with single-flight refresh and route guards | Accepted |
| ADR-0021 | Public browse filters and a scoped contributor directory | Accepted |

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

---

## ADR-0018 — Server-bound signed Cloudinary uploads and trusted verification

**Status:** Accepted

### Context

Image bytes should not transit the API, but a browser-controlled Cloudinary response cannot be trusted to create a photo record. The API must constrain uploads before they occur and verify the resulting asset afterward.

### Decision

- Use short-lived server-created upload authorizations bound to the authenticated user and a submission.
- Generate the Cloudinary public ID on the server under the configured archive folder.
- Sign only the required upload parameters with the Cloudinary API secret; return the API key but never the secret.
- Allow only image uploads with JPEG, PNG, or WebP format and enforce a 15 MB server-side limit after verification.
- Verify public ID, asset ID, resource type, delivery type, format, dimensions, byte size, and creation time through the Cloudinary Admin API.
- Persist a pending photo only after verification succeeds, then mark the authorization used in the same transaction.
- Require at least one explicit photographer credit and never infer it from the uploader.
- Delete expired unused authorized assets through a scheduled best-effort cleanup job.
- Keep the provider behind `CloudinaryAssetVerifier`; tests use an in-memory adapter.

### Consequences

- API servers do not handle image bytes and can scale independently from upload bandwidth.
- A malicious client cannot turn an arbitrary Cloudinary asset into a photo row.
- Cloudinary credentials and delivery semantics are isolated to one provider adapter.
- Cleanup is best effort and must be monitored for provider outages.
- Cloudinary production credentials and restricted upload presets are deployment requirements.

---

## ADR-0019 — Moderation transition table and derived submission status

**Status:** Accepted

### Context

Phase 05 activates the moderation schema defined in V2. Moderation must be predictable for administrators, safe against concurrent actions, and impossible to bypass for publication. Submission batches aggregate many photographs whose individual outcomes may differ, so the batch status needs a single authoritative rule.

### Decision

- Enforce an explicit transition table in `PhotoModerationService`: `approve` (`PENDING`/`FLAGGED` → `APPROVED`), `reject` (`PENDING`/`FLAGGED` → `REJECTED`), `flag` (`PENDING`/`APPROVED` → `FLAGGED`), `hide` (`APPROVED`/`FLAGGED`/`REJECTED` → `HIDDEN`), `remove` (any state except `REMOVED` → `REMOVED`), and `restore` (`FLAGGED`/`HIDDEN`/`REJECTED`/`REMOVED` → `PENDING`). Every other pairing returns `409 Conflict`.
- Require a reason for `reject`, `flag`, `hide`, `remove`, and `restore`.
- Require an album belonging to the photo's own event for approval; set `approved_at` and `approved_by_user_id` only there, and clear them whenever a photo leaves `APPROVED`.
- Write the `photo_moderations` row and the audit row, and re-derive the submission status in the same transaction as the status change; rely on `photos.version` for optimistic locking.
- Derive submission status from per-photo state: all photos `PENDING` → `PENDING`; no photos `PENDING`/`FLAGGED` → `COMPLETED`; otherwise `IN_REVIEW`. Never overwrite `WITHDRAWN`.
- Keep moderation history append-only through the existing database triggers; never write `photos.deleted_at` from moderation.
- Restrict reporting to photographs that satisfy the public-visibility predicate, allow one open report per user per photograph, and limit removal requests to the uploader (others receive `404`); approving a removal request reuses the `remove` transition.
- Review event suggestions only from `PENDING`, and materialise `createEvent: true` as an unpublished draft event through `ArchiveAdminService`.

### Consequences

- Administrators get deterministic, explainable rejections instead of silent no-ops.
- The public archive can never contain a photograph that skipped approval or lost its album.
- Concurrent moderation attempts resolve to `409` rather than a lost update.
- Submission status stays consistent with what a reviewer actually sees in the queue.
- Removal requested by a user and removal performed by an admin produce identical history and audit records.
- Restoring always returns a photograph to `PENDING`, so previously approved content is re-reviewed before publication.

---

## ADR-0020 — In-memory SPA sessions with single-flight refresh and route guards

**Status:** Accepted

### Context

Phase 06 connects the SPA to the Phase 02 session contract. The access token must not be readable by injected scripts after the tab closes, refresh cookies are `HttpOnly`, cookie-authenticated endpoints require CSRF, and several queries can fail with `401` at the same time after a token expires. Guards also need to make protected routes usable without pretending the frontend is a security boundary.

### Decision

- Keep the access token only in a module-level variable inside `lib/api/client.ts`; never write it to `localStorage`, `sessionStorage`, or a readable cookie.
- Restore sessions on mount by requesting a CSRF pair and posting it to `/auth/refresh`; anonymous visitors fall back to the public shell.
- Cache the CSRF token and header name in memory, and attach them only to cookie-authenticated calls (refresh and logout); bearer requests remain exempt.
- Serialize concurrent refreshes through one shared promise so a page with several failing queries rotates the refresh cookie once.
- Retry an authenticated request at most once after a successful refresh. Public auth calls and callers that disable retry never trigger a refresh.
- Surface failures as `ApiError` carrying the status and RFC 9457 `ProblemDetail` payload.
- Treat route guards as usability only: `RequireAuth` preserves the target in router state, `RequireRole` redirects mismatched roles to `/forbidden`, and the API re-authorizes every request.
- Code-split pages with `React.lazy`, keep shared design tokens in `styles/global.css`, and keep reusable primitives in `components/ui`.

### Consequences

- Refreshing the browser costs one CSRF request plus one refresh request before the session is known; the shell shows a loading state during that window.
- Token expiry is transparent to callers and does not produce a refresh storm.
- XSS remains able to read an active in-memory token, but the token is never persisted and the refresh cookie stays out of JavaScript's reach.
- A tampered client can reveal placeholder admin UI, but every mutation and read still fails with `401`/`403` at the API.
- Route-level code splitting keeps dashboard and admin bundles out of the initial load.

---

## ADR-0021 — Public browse filters and a scoped contributor directory

**Status:** Accepted

### Context

The PRD requires public visitors to search and filter the archive and to browse contributors. Phase 07 starts the public website, but the API only supported `page`/`size`/`query` on `GET /events` and had no contributor endpoint, despite `docs/API.md` claiming a contributor directory and a `/api/v1/search` endpoint. Title-only search cannot drive an archive UI that narrows by academic year, category, or featured status, and client-side filtering would break under server pagination.

### Decision

- Extend `GET /api/v1/events` with explicit `academicYearId`, `categoryId`, and `featured` filters alongside the existing `page`, `size`, and title `query`.
- Evaluate filters through a JPA `Specification` that always includes `published = true` and `deleted_at IS NULL`, so visibility is structural rather than a caller responsibility. Combine supplied filters conjunctively, use case-insensitive `LIKE` for the title query, and sort by event date descending then ID ascending.
- Do not add a generic `/api/v1/search` endpoint. Scoped search means narrowing continuous public listings; it does not introduce a cross-entity query language.
- Add `GET /api/v1/contributors` with the same pagination bounds as other public listings, returning only published, non-deleted profiles ordered by display name.
- Include ordered photographer credit names in public photo payloads so every published gallery can show attribution without exposing uploader identity, submission metadata, or moderation state.
- Restrict the public contributor DTO to `id`, `displayName`, `slug`, and `bio`. Never expose account identity, email, or moderation state, and do not imply that a profile publication publishes any pending photograph.
- Allow unauthenticated `GET` on `/api/v1/contributors` in `SecurityConfig`, matching the other public read paths.

### Consequences

- The frontend can implement archive filters and pagination against a stable contract without new dependencies.
- Every new filter inherits the public-visibility predicate, and a regression there fails the browse integration test.
- Contributors can be browsed publicly while their account details remain private.
- Future cross-entity search requires its own explicit ADR rather than silently appearing at `/api/v1/search`.

---

## ADR-0022 — Scoped dashboard read models and direct browser uploads

**Status:** Accepted

### Context

Phase 08 needs a member dashboard and a contribution flow. The existing own-contribution endpoints returned identifiers only, so a dashboard would have to resolve each event, album, category, and academic year against public endpoints. That fails for private or unpublished parents and multiplies requests. At the same time, pending and rejected photographs must never acquire a public delivery URL, while uploads must still keep image bytes away from the API.

### Decision

- Extend the user-scoped DTOs rather than adding a dashboard aggregate endpoint: own submissions include `eventTitle` and `albumTitle`; own photographs include event/album titles and ordered photographer credits; own suggestions include `categoryName` and `academicYearLabel`.
- Batch-load photographer credits for a page of own photographs with one repository query, and use `@EntityGraph` for the owning event, album, and submission, avoiding per-row lookups.
- Keep every read model scoped by the authenticated user in the repository query. There is no public route that exposes these DTOs.
- Continue to omit delivery URLs and Cloudinary identifiers from own-photo payloads. The dashboard shows metadata, moderation status, and attribution only. A member cannot use their private tracking view to fetch a pending or rejected asset.
- Upload directly from the browser to Cloudinary. The page creates one submission, then for each file requests a short-lived single-use authorization, posts the bytes with `credentials: 'omit'` and no archive bearer token or cookie, and registers the server-issued public ID. The API receives no image bytes and the browser never sees the Cloudinary API secret.
- Process files sequentially with per-item state. A failure leaves the saved submission intact and exposes an individual retry that requests a fresh authorization. The queue never advances another item past a hard submission-level failure by pretending it succeeded.
- Require an explicit photographer credit before an item can upload. A batch helper may fill empty credits, but it never overwrites an entered credit and never defaults to the uploader.
- Mirror the server password policy and file limits in the browser for fast feedback. The API validates both again and remains the security boundary.
- Clear the cached session after a password change or reset. The server revokes every refresh token on those paths, so keeping the SPA in an authenticated state would only defer a guaranteed failure.

### Consequences

- Dashboard pages render labels and credits without N+1 queries or access to public endpoints for private parents.
- Private upload metadata is visible to its owner but no delivery path is exposed before approval.
- Uploading a batch costs three requests per file (authorize, image host, register), which is acceptable for a community archive and keeps signing and verification server-side.
- The upload UI cannot show thumbnails for pending items; members review filenames, metadata, and statuses instead.
- Own removal requests are tracked only for the current session because no list endpoint exists yet; after a reload the API's conflict response is authoritative.
- Manual end-to-end upload verification requires Cloudinary credentials in the development environment. Without them, the UI exercises and reports the authorization failure rather than simulating success.

---

## ADR-0023 — Administrator-only preview identifiers in the moderation queue

**Status:** Accepted

### Context

Phase 09 needs a moderation workspace, but the queue read model returned only metadata. A moderator could not see the photograph they were about to publish, which is untenable for a photographic archive. The assets are already verified and stored through Cloudinary, and no signed-delivery infrastructure exists. Public and member read models intentionally omit delivery identifiers so pending and rejected content stays undiscoverable.

### Decision

- Add `cloudinaryPublicId` and `format` to the administrator moderation read model, together with `eventTitle` and `albumTitle` so the queue is readable without extra lookups.
- Return those fields only from role-protected `/admin/moderation/photos` and its transitions. Public and `/me` DTOs remain unchanged and continue to omit delivery identifiers.
- Render the preview in the admin UI with the existing public delivery helper. When the deployment has no cloud name, show a placeholder instead of constructing an unknown URL.
- Batch-load event, album, and uploader relationships for the queue with `@EntityGraph` rather than issuing per-row queries.
- Treat the public ID as a deliberate role-scoped disclosure, not a secret. The privacy boundary is the API surface plus moderation, not URL obscurity. Signed or authenticated delivery for pending assets would be a separate, larger change and requires its own ADR.

### Consequences

- Moderators can judge composition, quality, and attribution before approving a photograph.
- The disclosure is testable: `ModerationIntegrationIT` checks that the queue carries the identifier while `/me/photos` does not.
- Pending assets remain discoverable by anyone who already knows their public ID; the archive does not claim URL secrecy.
- A future move to private delivery must cover uploads, verification, previews, and approval together rather than adding signing to one screen.

## ADR-0024 — Anonymous, aggregate-only archive activity counters

**Status:** Accepted

### Context

The homepage needed to show how many people use the archive, how many accounts exist, and roughly how many are signed in. Any answer touches privacy: visitor analytics can drift into tracking individuals, and the project forbids unnecessary personal data collection. The deployment is a single free-tier instance with PostgreSQL and no analytics vendor, no Redis, and no client-side tracking service.

### Decision

- Count visitors with one row per anonymous visitor identifier per UTC day (`visitor_days`), keyed on `(visitor_id, visit_date)`, so a repeat visit is an idempotent update rather than a second row.
- Generate `visitor_id` in the browser as a random UUID stored in `localStorage`. Never derive it from the IP address, the user agent, a device fingerprint, or an account. The server never stores the IP address, user agent, or referrer of a visit.
- Record at most one visit per browser per UTC day, guarded client-side and enforced server-side by the primary key.
- Derive `registeredUsers` from verified accounts and `activeUsers` from non-revoked refresh sessions issued in the last 30 minutes. This avoids writing to `users` on every authenticated request, so the counter costs no extra write load.
- Expose only counts from `GET /public-stats`. No identifiers, drill-downs, or per-event activity cross the public boundary.
- Fail silently on the client: if the counter endpoint is unavailable, the homepage renders without the statistics block.

### Consequences

- The counts are honest but approximate: clearing browser storage or using a different browser counts again, and scripted requests could inflate visit counts, which is acceptable for a non-financial public counter.
- The archive can state exactly what it stores about visitors, which is a random alias and a date.
- Rows are per day, so a future retention policy or a daily snapshot table can prune old rows without changing the API contract.
- If exact unique-visitor analytics are ever required, that is a different decision with its own privacy review and vendor choice.

## ADR-0025 — Google sign-in through Identity Services ID tokens

**Status:** Accepted

### Context

Students expect to sign in with the Google account their college already uses, and the archive currently requires a password plus an emailed verification link. An OAuth authorization-code flow would need a client secret stored on the backend, a redirect URI, and a server-side token exchange. The archive is a static SPA on Vercel with a backend on Render Free and no secrets budget: every stored secret is another thing to rotate and leak.

### Decision

- Use the Google Identity Services **ID-token flow**: the browser asks Google for an ID token and posts it to `POST /api/v1/auth/google`. No client secret exists, no redirect URI is registered, and no code exchange happens.
- Verify the token server-side with Google's JWKS, enforcing signature, lifetime, issuer, audience, `email_verified`, `email`, and `sub`. Reuse `spring-security-oauth2-jose`, which is already a dependency.
- Link accounts **only** on a Google-verified email, which carries the same trust as a clicked verification link. Never link on an unverified email.
- Never change a role during linking, never take over an address bound to a different Google subject (`409`), and never revive a suspended or deactivated account (`401`).
- Create new Google accounts as `ACTIVE`, `USER`, with `password_hash = NULL`, and a database check that every account keeps at least one credential.
- Keep the feature inert without configuration: no client ID means no frontend button and a `503` from the API.
- Rate-limit per IP and per Google subject using the existing limiter, and audit each sign-in with booleans only.

### Consequences

- The archive stores no Google tokens, no refresh tokens from Google, and no client secret. A stolen database row cannot be used against Google.
- Accounts created through Google can set a password later through "Forgot password", because the reset token goes to the verified mailbox. That keeps the two flows compatible instead of creating two account classes.
- Revoking access happens in the archive (suspend the account), not at Google; there is no token to revoke because no long-lived Google credential is stored.
- Google can change its claims or rotate keys. Keys are fetched from Google's JWKS endpoint, so rotation is handled automatically; a new required claim would need a code change.
- Tests cannot reach Google, so the verifier is replaced in integration tests and the real JWKS path is covered by manual verification with a real client ID.

## ADR-0026 — Administrator re-filing and viewer-aware public actions

**Status:** Accepted

### Context

Moderation often finds a photograph in the wrong event or album, or with a title that misdescribes it. Fixing that used to mean rejecting the submission and asking the uploader to start again. Separately, the archive told visitors that they could report photographs, but the public UI exposed no report or removal action next to an image.

### Decision

- Approval accepts `albumId`, an optional `eventId`, and optional `title`, `caption`, and `altText`. A separate `PATCH /admin/photos/{id}` applies the same filing and detail edits without a transition.
- The album decides the photograph's event. `eventId` is accepted only as a consistency check, and is required when the album belongs to a different event than the photograph's current one.
- Every filing change is authorized on the server, recorded in the audit log as `PHOTO_DETAILS_UPDATED`, and never changes the moderation status.
- Migration `V8__photo_event_decoupled_from_submission.sql` replaces the `(submission_id, event_id)` foreign key with a submission-only key. The submission stays as provenance, and `photos_album_event_fk` continues to guarantee that the photo's event matches its album's event.
- Public album, photo, and recent-photo reads accept an optional bearer token and return `viewerCanRequestRemoval`. Only the uploader's requests receive `true`; uploader identity is still never exposed.
- Every published photograph renders a report action for signed-in users and a removal action only for the uploader. Guests receive a sign-in link that returns to the current page. Both actions are usability only; the API authorizes and validates them again.

### Consequences

- Administrators can correct a mis-filed contribution without destroying its submission, photographer credits, and moderation history.
- A photograph may now have an event different from its submission's event. The submission remains a record of how the contribution arrived, not a constraint on where the photograph belongs.
- Public pages send a bearer token when one exists. Query keys include the viewer identity, so a guest cache is never reused after sign-in.
- Reporting remains authenticated; anonymous reporting still needs abuse controls and is deferred.
