# Security

## 1. Status

Phase 00 implements a minimal security baseline:

- Deny-by-default Spring Security configuration.
- Public access limited to health and development documentation endpoints.
- Explicit CORS allowlist.
- Actuator exposure limited.
- OpenAPI and Swagger UI enabled only outside production.
- No secrets committed to the repository.

Phase 01 adds database-level security invariants: `GUEST` cannot be persisted as a role, approved photos require an album from the same event, public visibility requires approved photos in published non-deleted albums and events, and moderation/audit history is append-only at the database level.

Phase 02 implements authentication and authorization:

- Registration with email verification and BCrypt password hashing (strength 12).
- Short-lived HS256 access tokens and rotating, hashed, opaque refresh tokens in `HttpOnly` cookies.
- CSRF protection and `Origin` validation for cookie-authenticated endpoints.
- Password reset with single-use hashed tokens and session revocation.
- Deny-by-default route rules for `USER`, `ADMIN`, and `SUPER_ADMIN`.
- SUPER_ADMIN role and status management with self-change and last-super-admin protection.
- Environment-driven first SUPER_ADMIN bootstrap with forced password change.
- Append-only audit records for registration, verification, password changes, and role/status changes.
- Per-IP and per-account rate limiting for authentication endpoints.

Phase 03 implements the public archive boundary and archive administration:

- Public GET endpoints expose only published, non-deleted events and albums.
- Album photo responses use the existing approved-photo visibility predicate, which also requires a published, non-deleted parent event and album.
- Only `ADMIN` and `SUPER_ADMIN` may create, update, publish, or archive archive structure.
- Public responses expose DTOs rather than JPA entities and do not expose uploader identities or private moderation state.

Phase 04 implements the upload boundary:

- Only authenticated active users can create submissions or request upload authorization.
- Upload authorizations are single-use, short-lived, bound to the submitting user and submission, and contain a server-generated Cloudinary public ID.
- The Cloudinary API secret never leaves the backend.
- Production authentication email delivery uses Brevo's HTTPS API over port 443 on Render Free; the Brevo API key remains backend-only and is never logged or returned to clients.
- The returned Cloudinary asset is verified through the trusted Admin API before a photo row is created.
- Resource type, delivery type, public ID, asset ID, format, dimensions, byte size, and creation time are validated server-side.
- Only JPEG, PNG, and WebP assets up to 15 MB are accepted; each submission is limited to 50 photos.
- Photographer attribution is explicitly supplied and never derived from the uploader.
- Expired unused authorizations trigger best-effort Cloudinary cleanup.

Phase 05 implements moderation and content governance:

- All moderation endpoints live under `/api/v1/admin/**`, which requires `ADMIN` or `SUPER_ADMIN` on the server side; ordinary users receive `403`.
- Every photo transition follows the documented state machine, writes an append-only `photo_moderations` row and an audit row in the same transaction, and re-derives the owning submission's status.
- Approval requires an album belonging to the photo's own event; `approved_at` and `approved_by_user_id` are set only on approval and cleared whenever the photo leaves `APPROVED`.
- Reports only target photographs that satisfy the public-visibility predicate, so pending or private submissions cannot be probed by identifier. One open report per user per photograph.
- Removal requests are limited to the uploader; anyone else receives `404`. Approval drives the shared `remove` moderation transition.
- Approved event suggestions materialise unpublished draft events only; publication remains a separate administrative action.
- Audit-log and analytics reads are administrative; audit rows stay append-only.
- `GET /me/photos` exposes no delivery URLs, so pending and rejected assets stay unreachable through public image URLs.

Phase 08 implements the member-facing account and contribution boundary:

- Dashboard read models are scoped by the authenticated user in the repository query and add only display labels, ordered photographer credits, and moderation status. They do not add delivery URLs or Cloudinary identifiers.
- A successful contribution creates a public contributor directory profile from the uploader's display name. This is a separate profile from photographer-credit rows; the uploader is never silently assigned as photographer.
- The browser uploads directly to Cloudinary with a short-lived, single-use, server-bound authorization. The request sends no archive bearer token or cookie to the image host and never receives the Cloudinary API secret. The server still verifies every asset before creating a photo row.
- The upload form requires an explicit photographer credit per file and never derives it from the uploader.
- Accounts with `passwordChangeRequired` are redirected away from contributor pages, and the API enforces the same rule.
- Password change and reset clear the in-memory access token and cached user after the server revokes refresh-token families, preventing a stale authenticated UI from outliving its session.

This document records both the implemented baseline and the required target design.

## 2. Security principles

1. Backend authorization is the only security boundary.
2. Never trust client-side input, URLs, public IDs, image metadata, or route guards.
3. Least privilege for every role and endpoint.
4. Secure defaults; explicit exceptions.
5. Deny by default.
6. No secrets in source control or client bundles.
7. Preserve auditability for sensitive operations.
8. Protect private content, especially pending submissions.
9. Fail closed on verification and authorization errors.
10. Report suspected vulnerabilities to the project owner.

## 3. Trust boundaries

```text
Browser (untrusted)
   │
   ├── HTTPS ──> Vercel / static frontend
   │                  │
   │                  └── /api/* rewrite ──> Spring Boot API (trusted)
   │                                             │
   │                                             ├── PostgreSQL (private)
   │                                             └── Cloudinary Admin API (trusted verification)
   │
   └── signed direct upload ──> Cloudinary
```

The browser is untrusted. Cloudinary upload responses are untrusted until verified through a trusted server-to-server call. The database is private and not exposed publicly.

## 4. Roles and permissions

Exactly four roles exist. `GUEST` is unauthenticated.

| Capability | GUEST | USER | ADMIN | SUPER_ADMIN |
|---|---:|---:|---:|---:|
| Browse published content | ✅ | ✅ | ✅ | ✅ |
| Search/filter public archive | ✅ | ✅ | ✅ | ✅ |
| View public contributors | ✅ | ✅ | ✅ | ✅ |
| Upload photographs | — | ✅ | ✅ | ✅ |
| Suggest events | — | ✅ | ✅ | ✅ |
| Track own submissions | — | ✅ | ✅ | ✅ |
| Update own profile | — | ✅ | ✅ | ✅ |
| Request removal of own eligible submissions | — | ✅ | ✅ | ✅ |
| Report photographs | — | ✅ | ✅ | ✅ |
| Moderate photographs | — | — | ✅ | ✅ |
| Manage events, albums, categories | — | — | ✅ | ✅ |
| Review event suggestions | — | — | ✅ | ✅ |
| Handle reports | — | — | ✅ | ✅ |
| Manage ordinary users | — | — | ✅ | ✅ |
| View analytics and audit logs | — | — | ✅ | ✅ |
| Promote/demote administrators | — | — | — | ✅ |
| Manage super-admin privileges | — | — | — | ✅ |
| Configure system settings | — | — | — | ✅ |

Additional rules:

- No one may change their own role.
- An `ADMIN` cannot promote themselves or anyone else to `SUPER_ADMIN`.
- Only a `SUPER_ADMIN` may promote or demote administrators.
- The last active `SUPER_ADMIN` cannot be demoted or deactivated.
- Every role change is audited.
- Backend resource ownership checks are required in addition to role checks.

## 5. Authentication design

### 5.1 Passwords

- BCrypt with work factor 12 is implemented. Argon2id was considered but requires an additional dependency and is deferred until a concrete operational need appears.
- Password policy: 12–128 characters, at least one letter and one digit, no single repeated character, no common password, and not equal to the email address or display name.
- Passwords are never logged, returned, or written to audit records.
- A breached-password service check remains a later hardening option.
- Login, registration, and password-reset attempts are rate-limited.

### 5.2 Access tokens

- Short-lived JWT, approximately 10–15 minutes.
- Kept in frontend memory only.
- Sent in the `Authorization: Bearer` header.
- Signed with a strong secret or asymmetric key supplied through environment configuration.
- Contain only necessary claims: subject, role, token ID, issued-at, expiry.
- Revocation is primarily handled by short lifetime and refresh-session revocation.

### 5.3 Refresh tokens

- Opaque, cryptographically random, high-entropy values.
- Stored only as SHA-256 hashes in the database.
- Rotated on every refresh.
- Reuse detection revokes the entire token family.
- Absolute and idle expiry.
- Delivered in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Cookie path scoped to the authentication endpoints.
- No `Domain` attribute; production uses a same-origin API rewrite.
- Logout revokes the current token family.
- Suspension or password reset revokes active sessions.

### 5.4 Email verification and password reset

- Single-use, high-entropy tokens.
- Stored hashed with an expiry.
- Generic responses to prevent account enumeration.
- Password reset revokes existing sessions.
- Verification is required before upload permissions are granted.

### 5.5 Account status

Recommended statuses:

- `PENDING_VERIFICATION`
- `ACTIVE`
- `SUSPENDED`
- `DEACTIVATED`

Only `ACTIVE` accounts may authenticate and exercise role permissions.

### 5.6 First super administrator

- No hardcoded credentials.
- Use a one-time bootstrap command or environment-driven initialization.
- Force a password change after bootstrap.
- Record the bootstrap event in the audit log.

### 5.7 Implemented Phase 02 parameters

| Concern | Implemented value |
|---|---|
| Access token | HS256 JWT, 15-minute TTL, claims `sub`, `role`, `jti`, `iss`, `iat`, `exp` |
| JWT secret | `APP_JWT_SECRET`, minimum 32 bytes, fails startup when missing or short |
| Refresh token | 32 random bytes, base64url, SHA-256 hash at rest |
| Refresh expiry | idle 7 days, absolute family lifetime 30 days |
| Refresh cookie | `HttpOnly`, `SameSite=Lax`, `Secure` (configurable), `Path=/api/v1/auth`, no `Domain` |
| Refresh rotation | every successful refresh; reuse of a rotated token revokes the whole family in a `REQUIRES_NEW` transaction |
| Password hashing | BCrypt strength 12 |
| Verification token | 24-hour TTL, single-use, previous token invalidated on reissue |
| Reset token | 1-hour TTL, single-use, previous token invalidated on reissue |
| Session revocation | logout, password change, password reset, suspension, deactivation, and role change |
| Bootstrap | `APP_BOOTSTRAP_SUPER_ADMIN_EMAIL` / `_PASSWORD`; skipped when an active SUPER_ADMIN exists; sets `password_change_required=true`; audited |
| Principal loading | user, role, and status re-read from PostgreSQL on every authenticated request |

Password hashes, refresh tokens, and email/reset tokens are never logged or returned by the API.

### 5.8 Frontend session handling

- The access token lives in a module-level variable in `frontend/src/lib/api/client.ts`; it is never written to `localStorage` or `sessionStorage`.
- The refresh cookie is `HttpOnly`; the SPA asks for a CSRF pair and posts it to `/auth/refresh` to restore a session.
- CSRF pairs are cached in memory and attached only to cookie-authenticated calls; bearer requests are exempt.
- Concurrent `401` responses share one refresh request, and an authenticated request is retried at most once.
- Route guards are usability only. The API authorizes every request, and a modified client cannot widen its permissions.
- See `docs/FRONTEND.md` and ADR-0020.

## 6. CSRF and CORS

### CSRF

- Cookie-authenticated state-changing endpoints require CSRF protection.
- Use a double-submit token with an `HttpOnly` session-independent cookie and a readable CSRF cookie/header pair, or Spring Security's cookie repository.
- Validate `Origin` and `Referer` for state-changing requests.
- Access-token requests using `Authorization` are not cookie-authenticated, but refresh, logout, and any future cookie-authenticated endpoints must be protected.

**Phase 02 implementation:**

- `CookieCsrfTokenRepository` issues a readable `XSRF-TOKEN` cookie and accepts the `X-XSRF-TOKEN` header.
- CSRF is enforced for `/api/v1/auth/refresh` and `/api/v1/auth/logout` and for cookie-authenticated state-changing requests.
- CSRF is ignored only for the unauthenticated auth flows: register, verify-email, resend-verification, login, forgot-password, and reset-password.
- An `OriginValidationFilter` rejects state-changing `/api/**` requests whose `Origin` is present but not in the CORS allowlist.
- CORS allows credentials only for explicit configured origins.

### CORS

- Use an explicit origin allowlist.
- Never use `*` with credentialed requests.
- Allow only required methods and headers.
- Development origin: `http://localhost:5173`.
- Production prefers a same-origin `/api` rewrite, reducing CORS surface.

## 7. HTTP security headers

Production responses should include:

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`
- `Referrer-Policy: no-referrer` or a stricter policy
- `Permissions-Policy` disabling unnecessary browser features
- A Content Security Policy for the frontend, delivered by Vercel
- No server version or framework details in error responses

## 8. Input validation and injection

- Validate every request DTO with Jakarta Bean Validation.
- Validate path variables, query parameters, pagination limits, and sort fields.
- Use parameterized queries through JPA; never concatenate SQL.
- Escape output in the frontend by default; avoid `dangerouslySetInnerHTML`.
- Sanitize any permitted rich text.
- Enforce maximum lengths for all strings.
- Reject unknown or unexpected fields where appropriate.
- Do not reflect raw exception messages to clients.

## 9. Upload security

### Signed uploads

- The backend generates signed Cloudinary parameters.
- The client never receives the Cloudinary API secret.
- Use a signed upload preset with format, size, and transformation restrictions.
- Bind the authorization to the authenticated user, a generated public ID, and an expiry.
- Authorizations are single-use.

### Verification

Before creating a photo record, the backend must verify through a trusted Cloudinary API:

- The asset exists.
- The public ID matches the authorization.
- The resource type and delivery type are expected.
- The format is JPEG, PNG, or WebP.
- The byte size is within the configured limit.
- The dimensions are plausible.
- The asset was created within the authorization window.
- The asset is owned by the expected account/environment.
- The asset is not already attached to another photo record.

**Phase 04 implementation:** the API compares the verified response to the authorization's server-generated public ID, requires `resource_type=image` and `type=upload`, checks the allowed format/size/dimensions, checks the Cloudinary creation time against the authorization window, and rejects duplicate public or asset IDs. Only after all checks pass is a `PENDING` photo and its photographer-credit rows persisted.

Never trust client-provided URLs, public IDs, byte sizes, formats, or dimensions.

### Private pending assets

- Pending and rejected photographs must never be exposed through public APIs. Public photo responses are produced only by the approved-photo publication predicate.
- Public gallery pages build delivery URLs only from public read models. They never receive identifiers for pending assets and never resolve an identifier against an admin endpoint.
- Administrators receive `cloudinaryPublicId` and `format` in `GET /admin/moderation/photos` so they can review an upload before approving it. The disclosure is deliberately limited to the role-protected `/admin/**` surface; member (`/me`) and public read models continue to omit delivery identifiers. `ModerationIntegrationIT` asserts that `/me/photos` does not contain the field.
- The identifier is not treated as a secret. Uploads are verified and stored as public Cloudinary assets, so the privacy boundary is API discovery plus moderation, not URL secrecy. If the archive later needs URL secrecy for pending assets, it must add authenticated delivery and signed URLs rather than relying on an unguessable public ID (ADR-0023).
- Admin previews use the same unsigned delivery helper as the public gallery. When the deployment has no Cloudinary cloud name, the moderation UI shows a placeholder and makes no image request.
- Approval does not transition the asset between delivery modes in this phase. A future delivery-mode change must be designed and tested explicitly before it is relied on.

### Cleanup and metadata

- Expired or abandoned upload authorizations are cleaned up.
- Orphaned Cloudinary assets are deleted through the Admin API.
- EXIF location data is stripped or not published.
- Originals are exposed only where permitted.
- Upload rate limits apply per user and per IP.

## 10. Rate limiting and abuse prevention

Apply limits to:

- Login
- Registration
- Email verification
- Password reset
- Upload authorization
- Report creation
- Event suggestions

Use per-account and per-IP limits. Avoid account-lockout designs that let an attacker deny service to a known account. Return `429` with `Retry-After`. Document the single-instance limitation if an in-memory limiter is used.

**Phase 02 implementation:** a fixed-window in-memory limiter protects login (per IP and per account), registration and resend-verification (per IP), forgot-password (per account and per IP), and reset-password (per IP). Counters live in the JVM, so the limit applies per backend instance. A multi-instance deployment must replace it with a shared counter store before scaling out; this is an accepted Phase 02 limitation.

## 11. Audit logging

Audit at least:

- Role changes and privilege grants.
- User suspension, deactivation, and reactivation.
- Moderation decisions.
- Content removal and restoration.
- Report resolution.
- Event suggestion decisions.
- System setting changes.
- Bootstrap of the first super administrator.

Audit records are append-only and must not contain passwords, tokens, or secrets.

## 12. Secrets management

- Local secrets live in git-ignored `.env` files or IDE run configurations.
- Production secrets live in Render, Vercel, Neon, and GitHub secret stores.
- Never place secrets in `VITE_*` variables; they are bundled into the client.
- Rotate secrets after exposure.
- Use separate credentials for development and production.
- Do not log configuration values that may contain secrets.

## 13. Privacy and content governance

- No facial recognition or automatic student identification.
- Provide a clear privacy policy and takedown process.
- Consider consent requirements for identifiable individuals, especially minors.
- Strip unnecessary EXIF metadata.
- Do not expose private submissions or removed content.
- Preserve accurate photographer attribution.
- Define retention for originals, rejected uploads, and removed content.
- Provide a contact path for privacy complaints.

## 14. Dependency and vulnerability management

- Dependabot monitors Maven, npm, GitHub Actions, and Docker dependencies.
- Review security advisories promptly.
- Use `npm audit` and Maven dependency analysis in CI where practical.
- Add CodeQL or equivalent static analysis in Phase 10.
- Do not add unmaintained dependencies.
- Pin versions and review lockfile diffs.

## 15. Security test checklist

Phase 02 covers the authentication and authorization items below with automated tests. Domain-specific items are marked for their implementing phase.

- Guest cannot access private submissions. (Phase 04)
- User cannot access another user's submissions. (Phase 04)
- User cannot approve, reject, hide, or remove photographs. ✅ `ModerationIntegrationIT`
- Admin cannot promote themselves to super admin. ✅ `AuthorizationIT`
- Admin cannot demote the last super admin. ✅ `AuthorizationIT`
- User cannot reach admin endpoints. ✅ `AuthorizationIT`
- Rejected photographs never appear in public APIs. ✅ `ModerationIntegrationIT`
- Hidden and removed photographs never appear publicly. ✅ `ModerationIntegrationIT`
- Reports cannot target non-public photographs. ✅ `ModerationIntegrationIT`
- Only the uploader may request removal of an own photograph. ✅ `ModerationIntegrationIT`
- Users cannot modify another user's submissions. ✅ `ModerationIntegrationIT`
- Public endpoints do not expose private metadata or uploader details. (Phase 03)
- Unverified Cloudinary assets cannot become photo records. (Phase 04)
- A verified asset cannot be attached twice. (Phase 04)
- Refresh-token reuse revokes the token family. ✅ `RefreshSessionIT`
- Cookie-authenticated endpoints reject requests without a valid CSRF token. ✅ `RefreshSessionIT`
- Password reset revokes active sessions. ✅ `PasswordResetIT`
- Suspension takes effect on an existing access token. ✅ `AuthLoginIT`
- Forced password change blocks other endpoints. ✅ `PasswordChangeRequiredIT`
- Rate limits apply to login and upload authorization. ✅ login in `RateLimitIT`; uploads in Phase 04
- Upload authorization is bound to the user and submission and cannot be reused. ✅ `UploadIntegrationIT`
- Unverified or invalid Cloudinary assets cannot become photo records. ✅ `UploadIntegrationIT`
- Validation rejects oversized, unsupported, and malformed input. ✅ auth DTOs
- Error responses do not leak stack traces or secrets. ✅ problem-detail handlers

## 16. Incident response

1. Contain the issue: revoke tokens, rotate secrets, disable affected endpoints if necessary.
2. Preserve evidence and audit logs.
3. Assess affected users and content.
4. Notify the project owner and, where required, affected users.
5. Fix, test, and deploy.
6. Document the incident and preventive actions.
