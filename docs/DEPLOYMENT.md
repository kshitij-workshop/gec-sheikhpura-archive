# Deployment

## 1. Status

Phase 00 covers local development and CI foundations. Phase 10 adds browser smoke-test tooling and release verification. Production deployment is implemented in Phase 11.

## 2. Environments

| Environment | Frontend | Backend | Database | Images | Email |
|---|---|---|---|---|---|
| Local | Vite `:5173` | Spring Boot `:8080` | Docker PostgreSQL 17 | Cloudinary development account | Mailpit |
| CI | Build/test only | Build/test only | Testcontainers PostgreSQL | Mocked/not used | Not used |
| Production | Vercel | Render | Neon PostgreSQL | Cloudinary production account | Production SMTP/API provider |

## 3. Production topology

```text
Browser
  ├── HTTPS ──> Vercel (React SPA)
  │                └── /api/* rewrite ──> Render (Spring Boot)
  │                                           └── Neon PostgreSQL
  ├── signed direct upload ──> Cloudinary
  └── image delivery ──> Cloudinary CDN
```

The `/api/*` rewrite keeps refresh cookies first-party and avoids cross-site cookie restrictions.

## 4. Local development

### Start infrastructure

```bash
docker compose up -d
docker compose ps
```

### Backend

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

### Browser smoke tests

Install the pinned Chromium browser once:

```bash
cd frontend
npm run e2e:install
```

Run the deterministic smoke suite. It starts Vite automatically and stubs
public API reads, so it requires no credentials or production data:

```bash
npm run e2e
```

To run against an already deployed or locally running frontend instead of
starting Vite, set `E2E_BASE_URL`:

```bash
E2E_BASE_URL=https://staging.example.com npm run e2e
```

Real registration, SMTP, Cloudinary upload, and moderation journeys are kept
out of the default smoke suite until an isolated test database and provider
credentials are supplied.

### Health checks

```bash
curl -s http://localhost:8080/actuator/health
open http://localhost:8025
```

## 5. Required configuration

Names match `backend/src/main/resources/application.yml` exactly.

### Backend

| Variable | Purpose |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` in production |
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_POOL_MAX_SIZE` | Hikari maximum pool size |
| `CORS_ALLOWED_ORIGINS` | Explicit frontend origin allowlist (comma separated, no trailing slash) |
| `APP_JWT_SECRET` | Access-token signing secret (at least 32 bytes) |
| `APP_JWT_ISSUER` | Issuer claim, usually the backend base URL |
| `APP_FRONTEND_BASE_URL` | Public frontend URL used in verification and reset links |
| `APP_REFRESH_COOKIE_SECURE` | `true` in production |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_UPLOAD_PRESET` | Signed upload preset |
| `CLOUDINARY_UPLOAD_FOLDER` | Upload folder |
| `BREVO_API_KEY` | Brevo **API key** (not an SMTP key); used by the production profile over HTTPS |
| `MAIL_FROM` | Sender address verified in Brevo |
| `MAIL_FROM_NAME` | Sender display name |
| `MAIL_HOST` / `MAIL_PORT` | SMTP host/port; development only |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP credentials; development only |
| `MAIL_SMTP_CONNECTION_TIMEOUT` | SMTP connect timeout in ms (default `5000`) |
| `MAIL_SMTP_READ_TIMEOUT` | SMTP read timeout in ms (default `10000`) |
| `MAIL_SMTP_WRITE_TIMEOUT` | SMTP write timeout in ms (default `10000`) |

Production mail uses `https://api.brevo.com/v3/smtp/email` on port 443 because
Render Free blocks outbound SMTP ports. `BREVO_API_KEY` must be created under
Brevo → SMTP & API → **API Keys**; an SMTP key is rejected with HTTP `401`.
`MAIL_FROM` must be an address or domain verified under Brevo → Senders.

Delivery never blocks an API request: messages are rendered on the request
thread and sent on a two-thread daemon pool. `management.health.mail.enabled`
is `false` so `/actuator/health` does not wait for the mail provider.

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Usually `/api/v1` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Public Cloudinary cloud name |
| `VITE_APP_ENV` | Environment label |

Never put secrets in `VITE_*` variables.

## 6. Database migrations

- Flyway runs on application startup by default.
- `spring.jpa.hibernate.ddl-auto=validate` in deployed environments.
- `spring.flyway.clean-disabled=true`.
- Migrations are forward-only.
- Take a Neon backup or branch before destructive migrations.
- Use a single deploy instance during migration, or run migrations as a separate release step, to avoid concurrent migration attempts.
- Test migrations against a production-like database copy before release.

## 7. CI/CD

### Pull requests

- Backend: `./mvnw -B verify` with JDK 21 and Testcontainers.
- Frontend: `npm ci`, lint, typecheck, tests, production build.
- Dependency review and secret scanning.
- No automatic production deployment from pull requests.

### Main branch

- Merge only after required checks pass.
- Backend auto-deploys to Render.
- Frontend auto-deploys to Vercel.
- Production migrations run once through the chosen release process.
- Health checks and smoke tests run after deployment.

### Branch protection

- Require pull request reviews.
- Require status checks.
- Disable force pushes to `main`.
- Restrict who can push directly to `main`.

## 8. Backups and recovery

- Enable Neon automated backups and point-in-time restore.
- Document the recovery time and recovery point objectives.
- Test a restore before public launch.
- Cloudinary assets are not a database backup; maintain a documented asset-retention policy.
- Do not store production database dumps in the repository.

## 9. Monitoring and operations

- Render service health and logs.
- Neon connection and storage metrics.
- Actuator health endpoint monitored by an uptime service.
- Vercel deployment and performance metrics.
- Error tracking added only if justified and approved.
- Alerts for repeated health-check failures, database saturation, and elevated error rates.
- Never expose actuator endpoints beyond health/info.

## 10. Rollback

1. Revert the application deployment to the previous release.
2. Assess whether the database migration is backward compatible.
3. Prefer expand-and-contract migrations so application rollback remains safe.
4. Restore from backup only when data loss is unavoidable and approved.
5. Record the incident and follow-up actions.

## 11. Production launch checklist

- [ ] Domain configured with HTTPS.
- [ ] Production database provisioned and backed up.
- [ ] Production Cloudinary environment configured with restricted upload presets.
- [ ] Email delivery verified with SPF/DKIM/DMARC.
- [ ] Secrets stored in platform secret managers.
- [ ] CORS allowlist restricted to production origins.
- [ ] Refresh cookies configured as `Secure`, `HttpOnly`, `SameSite=Lax`, no `Domain`.
- [ ] CSRF protection enabled for cookie-authenticated endpoints.
- [ ] Rate limiting enabled.
- [ ] Actuator restricted.
- [ ] OpenAPI/Swagger disabled in production.
- [ ] Security headers verified.
- [ ] Backups and restore tested.
- [ ] Health monitoring and alerting active.
- [ ] Privacy policy, takedown process, and contact address published.
- [ ] Initial academic years, categories, and events loaded.
- [ ] First super administrator bootstrapped securely.
- [ ] End-to-end smoke test completed on production.
