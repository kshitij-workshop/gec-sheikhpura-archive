# API

## 1. Status

Phase 00 established the API conventions. Phase 01 added the database schema, entities, repositories, and shared pagination DTO. Phase 02 implements authentication, account management, and the authorization boundary. Phase 03 implements public academic-year, category, event, album, and approved-photo reads plus admin archive management. Phase 04 implements signed uploads and verified photo registration. Phase 05 implements moderation, reporting, removal requests, event suggestions, audit-log reads, and analytics. Phase 07 adds public event filters and the contributor directory. Phase 08 adds display labels to the user-scoped dashboard read models; no new public endpoint is introduced. Phase 09 completes the administrator frontend for the existing moderation, governance, archive, user, audit, and analytics contracts; it also adds event/album labels and an administrator-only preview identifier to the moderation queue read model; no public contract changes.

Every endpoint documented below is now implemented.

This document records implemented contracts and the conventions that must be followed when they change.

## 2. Base URL

```text
/api/v1
```

The frontend calls the API through the same origin:

- Development: Vite proxies `/api` to `http://localhost:8080`.
- Production: Vercel rewrites `/api/*` to the Render API.

## 3. Versioning

- The path contains the major version: `/api/v1`.
- Additive, backward-compatible changes are allowed within a version.
- Breaking changes require discussion, documentation, and a new version or an explicit migration plan.
- Never silently change an established contract.

## 4. Content types

- Requests and responses use `application/json` unless an endpoint explicitly accepts multipart data.
- Image bytes are uploaded directly to Cloudinary, not through the API.
- Timestamps use ISO-8601 UTC, for example `2026-11-14T10:15:30Z`.
- Identifiers are UUID strings.

## 5. Success responses

- Return the resource DTO directly, not a JPA entity.
- Return `201 Created` with the created resource or a `Location` header where appropriate.
- Return `204 No Content` for successful deletes or actions with no response body.
- Collections use a consistent page envelope.

### Page envelope

```json
{
  "items": [],
  "page": 0,
  "size": 24,
  "totalElements": 0,
  "totalPages": 0
}
```

## 6. Error responses

Use RFC 9457 `ProblemDetail`:

```json
{
  "type": "https://gecsheikhpura.example/problems/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/events",
  "errors": [
    { "field": "title", "message": "must not be blank" }
  ]
}
```

Rules:

- Never expose stack traces, SQL, internal class names, or secret values.
- Authentication failures return `401`.
- Authorization failures return `403`.
- Missing resources return `404` without leaking whether private resources exist.
- Conflict and state-transition failures return `409`.
- Validation failures return `400`.
- Rate limiting returns `429` with `Retry-After`.

## 7. Authentication

### 7.1 Token model

- Protected endpoints require `Authorization: Bearer <access-token>`.
- Access tokens are HS256 JWTs with a 15-minute lifetime and the claims `sub`, `role`, `jti`, `iss`, `iat`, `exp`. The frontend keeps them in memory only.
- Refresh tokens are opaque 256-bit values stored only as SHA-256 hashes. The raw value is delivered in a `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth` and rotated on every refresh.
- Cookie-authenticated state-changing endpoints (`/auth/refresh`, `/auth/logout`) require the `X-XSRF-TOKEN` header matching the readable `XSRF-TOKEN` cookie.
- `GET /api/v1/auth/csrf` issues the CSRF cookie and returns the token plus header name.
- Every authenticated request reloads the user from PostgreSQL, so suspension and role changes take effect before the access token expires.
- Never expose password hashes, refresh tokens, verification tokens, or reset tokens in responses or logs.

### 7.2 Endpoints

All paths are relative to `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/csrf` | Public | Issue CSRF cookie; returns `{ token, headerName }` |
| `POST` | `/auth/register` | Public | Register a `PENDING_VERIFICATION` account |
| `POST` | `/auth/verify-email` | Public | Consume a single-use verification token |
| `POST` | `/auth/resend-verification` | Public | Reissue a verification email |
| `POST` | `/auth/login` | Public | Issue an access token and refresh cookie |
| `POST` | `/auth/google` | Public | Exchange a Google ID token for an archive session |
| `POST` | `/auth/refresh` | Refresh cookie + CSRF | Rotate refresh token and issue a new access token |
| `POST` | `/auth/logout` | Refresh cookie + CSRF | Revoke the current token family and clear the cookie |
| `POST` | `/auth/forgot-password` | Public | Send a password-reset email |
| `POST` | `/auth/reset-password` | Public | Consume a reset token and revoke all sessions |
| `GET` | `/me` | Bearer | Current profile |
| `PATCH` | `/me` | Bearer + CSRF | Update display name |
| `PATCH` | `/me/password` | Bearer + CSRF | Change password; revokes all sessions |
| `GET` | `/admin/users` | `ADMIN`/`SUPER_ADMIN` | Paginated user directory |
| `PATCH` | `/admin/users/{id}/status` | `ADMIN`/`SUPER_ADMIN` | Suspend, deactivate, or reactivate |
| `PATCH` | `/admin/users/{id}/role` | `SUPER_ADMIN` | Change a user's role |

CSRF is not required for `register`, `verify-email`, `resend-verification`, `login`, `google`, `forgot-password`, or `reset-password`, because those requests do not authenticate with a cookie.

### 7.3 Request and response shapes

Register:

```json
{ "email": "student@example.com", "password": "ArchivePass1234", "displayName": "Student Name" }
```

Google sign-in (the ID token comes from Google Identity Services in the browser
and is never stored):

```json
{ "idToken": "<google-id-token>" }
```

Login, Google, and refresh response:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "0f8fad5b-d9cb-469f-a165-70867728950e",
    "email": "student@example.com",
    "displayName": "Student Name",
    "role": "USER",
    "status": "ACTIVE",
    "emailVerifiedAt": "2026-11-14T10:15:30Z",
    "createdAt": "2026-11-14T10:00:00Z",
    "passwordChangeRequired": false
  }
}
```

| Endpoint | Success | Notes |
|---|---|---|
| `POST /auth/register` | `202` `{ "message": ... }` | Generic response; never reveals whether the email exists |
| `POST /auth/google` | `200` | Verifies the ID token with Google's JWKS, then issues the normal session |
| `POST /auth/verify-email` | `204` | Invalid, used, or expired token returns `400` |
| `POST /auth/resend-verification` | `202` | Generic response |
| `POST /auth/forgot-password` | `202` | Generic response |
| `POST /auth/reset-password` | `204` | Revokes all refresh sessions |
| `POST /auth/logout` | `204` | Clears the refresh cookie |
| `PATCH /me/password` | `204` | Clears the refresh cookie after revocation |

Error behaviour:

- Invalid credentials, inactive accounts, and invalid refresh tokens return `401` with `WWW-Authenticate: Bearer`.
- `POST /auth/google` returns `401` for an unverifiable or expired ID token, for an unverified Google email, or for a suspended or deactivated account.
- `POST /auth/google` returns `409` when the email address is already connected to a different Google account.
- `POST /auth/google` returns `503` when the deployment has no Google client ID; the browser hides its button in that case.
- Missing, invalid, or reused CSRF tokens on cookie endpoints return `403`.
- Requests from a disallowed `Origin` on `/api/**` return `403`.
- `ADMIN` attempts to change roles return `403`; `GUEST` role persistence returns `400`.
- Changing your own role or status returns `403`.
- Demoting or deactivating the last active `SUPER_ADMIN` returns `403`.
- Accounts with `passwordChangeRequired=true` may only call `GET /me`, `PATCH /me/password`, `GET /auth/csrf`, `POST /auth/refresh`, and `POST /auth/logout` until the password is changed; other endpoints return `403`.
- Authentication rate limits return `429` with `Retry-After`.

## 8. Pagination, sorting, and filtering

Common query parameters:

| Parameter | Meaning | Default |
|---|---|---|
| `page` | Zero-based page index | `0` |
| `size` | Page size, bounded by the server | `24` |
| `sort` | Field and direction, e.g. `eventDate,desc` | Endpoint-specific |

Rules:

- Validate `size` against a server-side maximum.
- Allow only documented sort fields.
- Use explicit filter parameters; do not expose arbitrary query languages.
- Public list endpoints return only published, approved, non-deleted content.

## 9. Archive management and public endpoints

Phase 03, Phase 04 and Phase 05 implement the archive, upload and governance endpoints below.

### Public (implemented)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/events` | Paginated published events |
| `GET` | `/api/v1/events/{id}` | Published event details |
| `GET` | `/api/v1/events/slug/{slug}` | Published event details by slug |
| `GET` | `/api/v1/albums/{id}` | Published album and its approved photos |
| `GET` | `/api/v1/albums/slug/{slug}` | Published album by slug and its approved photos |
| `GET` | `/api/v1/photos/{id}` | Approved photo details |
| `GET` | `/api/v1/academic-years` | Public academic timeline |
| `GET` | `/api/v1/categories` | Public categories |
| `GET` | `/api/v1/contributors` | Public contributor directory |
| `GET` | `/api/v1/public-stats` | Aggregate archive activity counters |
| `POST` | `/api/v1/public-stats/visits` | Record one anonymous visit for the current UTC day |

`GET /public-stats` returns `totalVisitors`, `visitorsToday`, `registeredUsers`, `activeUsers`, and `generatedAt`. It contains counts only: no visitor identifier, account, email, IP address, or per-event activity is exposed. `totalVisitors` counts distinct anonymous visitor identifiers, `registeredUsers` counts verified accounts, and `activeUsers` counts accounts holding a refresh session issued in the last 30 minutes, which approximates who is signed in now.

`POST /public-stats/visits` accepts `{"visitorId": "<uuid>"}` and returns `204`. It is public and CSRF-exempt because it carries no session and is guarded by the origin allowlist. The write is idempotent per `(visitorId, UTC day)`, so the browser calls it at most once per day. A malformed identifier returns `400`.


`GET /events` accepts `page` (default `0`), `size` (default `24`, clamped to `1–100`), and optional filters: case-insensitive `query` against the event title, `academicYearId`, `categoryId`, and `featured` (`true`/`false`). Filters combine conjunctively and only published, non-deleted events are returned; results are ordered by event date descending, then ID ascending. There is no separate archive search endpoint: title search is the `query` filter on `GET /events`, and album, category, and academic-year narrowing is done with the filters above.

`GET /albums/{id}` accepts `page` and `size` for approved photo pagination. Each public photo exposes display metadata plus `cloudinaryPublicId`, `format`, and an ordered `photographers` list (`creditName`, `creditOrder`). No delivery URL, uploader identity, submission, or moderation metadata is exposed. `GET /photos/{id}` returns a photo only when it satisfies the complete event/album/photo publication predicate. Public album photo results apply the same predicate.

`GET /contributors` returns a paginated directory of published, non-deleted contributor profiles ordered by display name ascending, then ID ascending. It accepts `page` (default `0`) and `size` (default `24`, clamped to `1–100`). Each item exposes only `id`, `displayName`, `slug`, and `bio`; account identifiers, email addresses, and unpublished or deleted profiles never cross this boundary.

### Upload flow

1. `POST /me/submissions` creates a pending submission owned by the authenticated user.
2. `POST /me/uploads/authorize` returns a short-lived signature, server-generated `publicId`, upload URL, Cloudinary API key, preset, expiry, 15 MB limit, and allowed formats.
3. The client uploads bytes directly to Cloudinary; bytes never pass through the API.
4. `POST /me/submissions/{id}/photos` accepts the authorization ID, returned public ID, display metadata, and at least one photographer credit. The server verifies the asset through Cloudinary before persisting a pending photo.

After the first successful photo registration, the authenticated uploader receives a published contributor profile using their display name and a unique slug. This profile represents the community contributor/uploader and is not automatically attached to any photographer credit. The uploader must still explicitly name photographers for each photograph.

Upload authorizations expire after 10 minutes, are single-use, are bound to the user and submission, and are limited to 50 photos per submission. Authorization requests are rate-limited per user and IP. Client-supplied asset IDs, dimensions, formats, and byte sizes are not trusted.

### Moderation flow

1. Registration persists a `PENDING` photograph and writes the opening `SUBMIT` moderation record.
2. `GET /admin/moderation/photos?status=PENDING` returns the oldest-first queue with photographer credits for attribution review. Each item also carries `eventTitle`, `albumTitle`, `cloudinaryPublicId`, and `format` so an administrator can recognise the photograph before approving it.
3. `POST /admin/photos/{id}/{approve|reject|flag|hide|remove|restore}` transitions the photograph. Every transition writes a `photo_moderations` row, an audit row, and re-derives the owning submission's status in one transaction.
4. `GET /admin/photos/{id}/moderation-history` returns the append-only history.
5. Approved photographs become publicly readable only when their album and event are also published and not deleted.

The queue's `cloudinaryPublicId` is an administrator-only disclosure. It is read exclusively through role-protected `/admin/**` endpoints; public and member read models continue to omit delivery identifiers, and pending or rejected assets never appear in a public response. See ADR-0023.

Allowed transitions:

| Action | From | To | Extra input |
|---|---|---|---|
| `approve` | `PENDING`, `FLAGGED` | `APPROVED` | `albumId` when the photograph has none; must belong to the same event |
| `reject` | `PENDING`, `FLAGGED` | `REJECTED` | `reason` |
| `flag` | `PENDING`, `APPROVED` | `FLAGGED` | `reason` |
| `hide` | `APPROVED`, `FLAGGED`, `REJECTED` | `HIDDEN` | `reason` |
| `remove` | any except `REMOVED` | `REMOVED` | `reason` |
| `restore` | `FLAGGED`, `HIDDEN`, `REJECTED`, `REMOVED` | `PENDING` | `reason` |

Any other pairing returns `409 Conflict`. `approved_at` and `approved_by_user_id` are set on approval and cleared whenever the photograph leaves `APPROVED`.

Governance rules:

- `POST /photos/{id}/reports` only resolves photographs that satisfy the public-visibility predicate, so pending and private submissions cannot be probed by identifier. One open (`PENDING` or `UNDER_REVIEW`) report per user per photograph.
- `POST /me/photos/{id}/removal-request` is limited to the uploader; anyone else receives `404`. One `PENDING` request per user per photograph. Approving it drives the photograph through the shared `remove` transition.
- `PATCH /admin/event-suggestions/{id}` only accepts `PENDING` suggestions. With `createEvent: true` it materialises an **unpublished** draft event, so nothing reaches the public archive until published separately.
- `GET /admin/audit-logs` accepts optional `action`, `entityType` and `entityId` filters, newest first.
- `GET /admin/analytics` returns status maps that always contain every known enum constant.

### User (implemented)

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/me` | Implemented | Current profile |
| `PATCH` | `/api/v1/me` | Implemented | Update profile |
| `POST` | `/api/v1/me/submissions` | Implemented | Create a submission targeting an event and optional album |
| `GET` | `/api/v1/me/submissions` | Implemented | List own submissions |
| `POST` | `/api/v1/me/uploads/authorize` | Implemented | Request a short-lived signed Cloudinary upload |
| `POST` | `/api/v1/me/submissions/{id}/photos` | Implemented | Verify and register an uploaded asset with metadata and photographer credits |
| `GET` | `/api/v1/me/photos` | Implemented | Own photographs with moderation status; no delivery URLs |
| `POST` | `/api/v1/me/event-suggestions` | Implemented | Suggest an event |
| `GET` | `/api/v1/me/event-suggestions` | Implemented | Track own suggestions |
| `POST` | `/api/v1/me/photos/{id}/removal-request` | Implemented | Request removal of an own photograph |
| `POST` | `/api/v1/photos/{id}/reports` | Implemented | Report a publicly visible photograph |

Own submissions, own photographs, and own event suggestions carry the display labels a dashboard needs, so tracking never resolves identifiers against public endpoints (which would fail for unpublished events and albums):

- `GET /me/submissions` items include `eventTitle` and `albumTitle`.
- `GET /me/photos` items include `eventTitle`, `albumTitle`, and ordered `photographers` (`creditName`, `creditOrder`). They still never include a delivery URL or Cloudinary identifier.
- `GET /me/event-suggestions` items include `categoryName` and `academicYearLabel`.

### Admin (implemented)

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/users` | Implemented | User directory |
| `PATCH` | `/api/v1/admin/users/{id}/status` | Implemented | Suspend or reactivate |
| `PATCH` | `/api/v1/admin/users/{id}/role` | Implemented (`SUPER_ADMIN`) | Change a role |
| `GET` | `/api/v1/admin/academic-years` | Implemented | List all academic years |
| `POST` | `/api/v1/admin/academic-years` | Implemented | Create academic year |
| `PATCH` | `/api/v1/admin/academic-years/{id}` | Implemented | Update academic year |
| `DELETE` | `/api/v1/admin/academic-years/{id}` | Implemented | Delete unused academic year |
| `GET` | `/api/v1/admin/categories` | Implemented | List categories |
| `POST` | `/api/v1/admin/categories` | Implemented | Create category |
| `PATCH` | `/api/v1/admin/categories/{id}` | Implemented | Update category |
| `DELETE` | `/api/v1/admin/categories/{id}` | Implemented | Deactivate category |
| `GET` | `/api/v1/admin/events` | Implemented | List events, including unpublished records |
| `POST` | `/api/v1/admin/events` | Implemented | Create event |
| `PATCH` | `/api/v1/admin/events/{id}` | Implemented | Update/publish event |
| `DELETE` | `/api/v1/admin/events/{id}` | Implemented | Archive event |
| `GET` | `/api/v1/admin/albums?eventId={id}` | Implemented | List albums for an event |
| `POST` | `/api/v1/admin/albums` | Implemented | Create album |
| `PATCH` | `/api/v1/admin/albums/{id}` | Implemented | Update/publish album |
| `DELETE` | `/api/v1/admin/albums/{id}` | Implemented | Archive album |

Album titles must be unique within one event and may repeat across events; the title is compared case-insensitively and archived albums release their title. Album slugs stay globally unique because they are public URLs: a generated slug is disambiguated with a numeric suffix (`2k24-batch`, `2k24-batch-2`), while an explicitly supplied colliding slug returns `409`. `PATCH /admin/albums/{id}` keeps the previous slug when `slug` is omitted, so renaming a title never breaks a shared link.
| `GET` | `/api/v1/admin/moderation/photos` | Implemented | Moderation queue, optionally filtered by `status` |
| `GET` | `/api/v1/admin/photos/{id}/moderation-history` | Implemented | Append-only transition history |
| `POST` | `/api/v1/admin/photos/{id}/approve` | Implemented | Approve, assigning an album when absent |
| `POST` | `/api/v1/admin/photos/{id}/reject` | Implemented | Reject with reason |
| `POST` | `/api/v1/admin/photos/{id}/flag` | Implemented | Flag with reason |
| `POST` | `/api/v1/admin/photos/{id}/hide` | Implemented | Hide with reason |
| `POST` | `/api/v1/admin/photos/{id}/remove` | Implemented | Remove with reason |
| `POST` | `/api/v1/admin/photos/{id}/restore` | Implemented | Restore to `PENDING` with reason |
| `GET` | `/api/v1/admin/reports` | Implemented | Reports, optionally filtered by `status` |
| `PATCH` | `/api/v1/admin/reports/{id}` | Implemented | Move to `UNDER_REVIEW`, `RESOLVED` or `DISMISSED` |
| `GET` | `/api/v1/admin/removal-requests` | Implemented | Removal requests, optionally filtered by `status` |
| `PATCH` | `/api/v1/admin/removal-requests/{id}` | Implemented | Approve (which removes the photo) or reject |
| `GET` | `/api/v1/admin/event-suggestions` | Implemented | Event suggestions, optionally filtered by `status` |
| `PATCH` | `/api/v1/admin/event-suggestions/{id}` | Implemented | Review suggestion, optionally creating an event |
| `GET` | `/api/v1/admin/audit-logs` | Implemented | Audit history, filterable by action/entity |
| `GET` | `/api/v1/admin/analytics` | Implemented | Administrative analytics |

## 10. Operational endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/actuator/health` | Public health check; no sensitive details |
| `GET` | `/actuator/info` | Enabled only if configured |
| `GET` | `/v3/api-docs` | OpenAPI document; dev/test only |
| `GET` | `/swagger-ui.html` | Swagger UI; dev/test only |

## 11. Contract change policy

Before changing an API contract:

1. Document the current and proposed shapes.
2. Identify affected frontend features and tests.
3. Decide whether the change is additive or breaking.
4. Update `docs/API.md` and OpenAPI annotations.
5. Add or update integration tests.
6. Obtain owner approval for breaking changes.
