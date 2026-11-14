# Security

## 1. Status

Phase 00 implements a minimal security baseline:

- Deny-by-default Spring Security configuration.
- Public access limited to health and development documentation endpoints.
- Explicit CORS allowlist.
- Actuator exposure limited.
- OpenAPI and Swagger UI enabled only outside production.
- No secrets committed to the repository.

Authentication, cookie-based sessions, CSRF protection, upload authorization, and full RBAC are implemented in later phases. This document records both the implemented baseline and the required target design.

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

- Hash with Argon2id where operationally supported, otherwise BCrypt with a strong work factor.
- Never log or return password hashes.
- Enforce a minimum password policy with a breached-password check where feasible.
- Rate-limit login and password-reset attempts.

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

## 6. CSRF and CORS

### CSRF

- Cookie-authenticated state-changing endpoints require CSRF protection.
- Use a double-submit token with an `HttpOnly` session-independent cookie and a readable CSRF cookie/header pair, or Spring Security's cookie repository.
- Validate `Origin` and `Referer` for state-changing requests.
- Access-token requests using `Authorization` are not cookie-authenticated, but refresh, logout, and any future cookie-authenticated endpoints must be protected.

**Phase 00 note:** CSRF is disabled because no cookie authentication exists yet and all non-public endpoints are denied. It must be enabled in Phase 02 before any cookie-based endpoint is introduced.

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

Never trust client-provided URLs, public IDs, byte sizes, formats, or dimensions.

### Private pending assets

- Pending uploads must not use public delivery URLs.
- Use a private/authenticated delivery mode or a separately restricted mechanism.
- Approval must transition the asset to public delivery safely, or public pages must serve controlled URLs.
- Verify the exact Cloudinary behavior in a Phase 04 spike before implementation.

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

- Guest cannot access private submissions.
- User cannot access another user's submissions.
- User cannot approve, reject, hide, or remove photographs.
- Admin cannot promote themselves to super admin.
- Admin cannot demote the last super admin.
- Rejected photographs never appear in public APIs.
- Hidden and removed photographs never appear publicly.
- Public endpoints do not expose private metadata or uploader details.
- Unverified Cloudinary assets cannot become photo records.
- A verified asset cannot be attached twice.
- Refresh-token reuse revokes the token family.
- Cookie-authenticated endpoints reject requests without a valid CSRF token.
- Rate limits apply to login and upload authorization.
- Validation rejects oversized, unsupported, and malformed input.
- Error responses do not leak stack traces or secrets.

## 16. Incident response

1. Contain the issue: revoke tokens, rotate secrets, disable affected endpoints if necessary.
2. Preserve evidence and audit logs.
3. Assess affected users and content.
4. Notify the project owner and, where required, affected users.
5. Fix, test, and deploy.
6. Document the incident and preventive actions.
