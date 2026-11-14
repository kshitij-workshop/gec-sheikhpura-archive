# API

## 1. Status

Phase 01 adds the database schema, entities, repositories, and shared pagination DTO. It does not expose domain endpoints yet; those are implemented in Phases 02–05. This document defines the conventions that all endpoints must follow.

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

- Protected endpoints require `Authorization: Bearer <access-token>`.
- Access tokens are short-lived and kept in memory by the frontend.
- Refresh tokens are delivered in secure `HttpOnly` cookies.
- Cookie-authenticated state-changing endpoints require CSRF protection.
- Public endpoints must never require or leak private credentials.

The authentication endpoints are finalized in Phase 02.

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

## 9. Planned endpoint groups

These are contract placeholders, not implemented endpoints. Exact paths and DTOs are finalized before frontend integration.

### Public

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

### Authentication

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register |
| `POST` | `/api/v1/auth/verify-email` | Verify email |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and issue access token |
| `POST` | `/api/v1/auth/logout` | Revoke current session |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset |
| `POST` | `/api/v1/auth/reset-password` | Complete password reset |

### User

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/me` | Current profile |
| `PATCH` | `/api/v1/me` | Update profile |
| `GET` | `/api/v1/me/photos` | Own submissions |
| `POST` | `/api/v1/me/submissions` | Create submission batch |
| `POST` | `/api/v1/me/uploads/authorize` | Request signed Cloudinary upload |
| `POST` | `/api/v1/me/submissions/{id}/photos` | Register verified uploaded asset |
| `POST` | `/api/v1/me/event-suggestions` | Suggest an event |
| `POST` | `/api/v1/me/photos/{id}/removal-request` | Request removal |
| `POST` | `/api/v1/photos/{id}/reports` | Report a photograph |

### Admin

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/moderation/photos` | Moderation queue |
| `POST` | `/api/v1/admin/photos/{id}/approve` | Approve |
| `POST` | `/api/v1/admin/photos/{id}/reject` | Reject with reason |
| `POST` | `/api/v1/admin/photos/{id}/flag` | Flag |
| `POST` | `/api/v1/admin/photos/{id}/hide` | Hide |
| `POST` | `/api/v1/admin/photos/{id}/remove` | Remove |
| `GET` | `/api/v1/admin/reports` | Reports |
| `PATCH` | `/api/v1/admin/reports/{id}` | Resolve or dismiss |
| `GET` | `/api/v1/admin/event-suggestions` | Event suggestions |
| `PATCH` | `/api/v1/admin/event-suggestions/{id}` | Review suggestion |
| `GET` | `/api/v1/admin/audit-logs` | Audit history |
| `GET` | `/api/v1/admin/analytics` | Administrative analytics |

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
