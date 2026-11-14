# API

## 1. Status

Phase 00 established the API conventions. Phase 01 added the database schema, entities, repositories, and shared pagination DTO. Phase 02 implements authentication, account management, and the authorization boundary. Domain endpoints for events, albums, photos, moderation, and reports are implemented in later phases.

This document records implemented contracts and the conventions that later endpoints must follow.

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

CSRF is not required for `register`, `verify-email`, `resend-verification`, `login`, `forgot-password`, or `reset-password`, because those requests do not authenticate with a cookie.

### 7.3 Request and response shapes

Register:

```json
{ "email": "student@example.com", "password": "ArchivePass1234", "displayName": "Student Name" }
```

Login and refresh response:

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
| `POST /auth/verify-email` | `204` | Invalid, used, or expired token returns `400` |
| `POST /auth/resend-verification` | `202` | Generic response |
| `POST /auth/forgot-password` | `202` | Generic response |
| `POST /auth/reset-password` | `204` | Revokes all refresh sessions |
| `POST /auth/logout` | `204` | Clears the refresh cookie |
| `PATCH /me/password` | `204` | Clears the refresh cookie after revocation |

Error behaviour:

- Invalid credentials, inactive accounts, and invalid refresh tokens return `401` with `WWW-Authenticate: Bearer`.
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

## 9. Endpoint roadmap

Public domain endpoints and the remaining user/admin workflows are contract placeholders, not implemented endpoints. Implemented authentication, account, and role-management contracts are documented in section 7.

### Public (Phase 03)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/events` | Paginated published events |
| `GET` | `/api/v1/events/{id}` | Published event details |
| `GET` | `/api/v1/albums/{id}` | Published album and its approved photos |
| `GET` | `/api/v1/photos/{id}` | Approved photo details |
| `GET` | `/api/v1/academic-years` | Public academic timeline |
| `GET` | `/api/v1/categories` | Public categories |
| `GET` | `/api/v1/contributors` | Public contributor directory |
| `GET` | `/api/v1/search` | Archive search |

### User (Phase 04–05)

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/me` | Implemented | Current profile |
| `PATCH` | `/api/v1/me` | Implemented | Update profile |
| `GET` | `/api/v1/me/photos` | Planned | Own submissions |
| `POST` | `/api/v1/me/submissions` | Planned | Create submission batch |
| `POST` | `/api/v1/me/uploads/authorize` | Planned | Request signed Cloudinary upload |
| `POST` | `/api/v1/me/submissions/{id}/photos` | Planned | Register verified uploaded asset |
| `POST` | `/api/v1/me/event-suggestions` | Planned | Suggest an event |
| `POST` | `/api/v1/me/photos/{id}/removal-request` | Planned | Request removal |
| `POST` | `/api/v1/photos/{id}/reports` | Planned | Report a photograph |

### Admin (Phase 02 and Phase 05–06)

| Method | Path | Status | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/users` | Implemented | User directory |
| `PATCH` | `/api/v1/admin/users/{id}/status` | Implemented | Suspend or reactivate |
| `PATCH` | `/api/v1/admin/users/{id}/role` | Implemented (`SUPER_ADMIN`) | Change a role |
| `GET` | `/api/v1/admin/moderation/photos` | Planned | Moderation queue |
| `POST` | `/api/v1/admin/photos/{id}/approve` | Planned | Approve |
| `POST` | `/api/v1/admin/photos/{id}/reject` | Planned | Reject with reason |
| `POST` | `/api/v1/admin/photos/{id}/flag` | Planned | Flag |
| `POST` | `/api/v1/admin/photos/{id}/hide` | Planned | Hide |
| `POST` | `/api/v1/admin/photos/{id}/remove` | Planned | Remove |
| `GET` | `/api/v1/admin/reports` | Planned | Reports |
| `PATCH` | `/api/v1/admin/reports/{id}` | Planned | Resolve or dismiss |
| `GET` | `/api/v1/admin/event-suggestions` | Planned | Event suggestions |
| `PATCH` | `/api/v1/admin/event-suggestions/{id}` | Planned | Review suggestion |
| `GET` | `/api/v1/admin/audit-logs` | Planned | Audit history |
| `GET` | `/api/v1/admin/analytics` | Planned | Administrative analytics |

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
