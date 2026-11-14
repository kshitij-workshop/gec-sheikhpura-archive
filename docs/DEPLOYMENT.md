# Deployment

## 1. Status

Phase 00 covers local development and CI foundations. Production deployment is implemented in Phase 11.

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

### Health checks

```bash
curl -s http://localhost:8080/actuator/health
open http://localhost:8025
```

## 5. Required configuration

Names are indicative and will be finalized as features are implemented.

### Backend

| Variable | Purpose |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` in production |
| `DB_URL` | PostgreSQL JDBC URL |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_POOL_MAX_SIZE` | Hikari maximum pool size |
| `CORS_ALLOWED_ORIGINS` | Explicit frontend origin allowlist |
| `JWT_SIGNING_KEY` | Access-token signing secret/key |
| `REFRESH_TOKEN_PEPPER` | Additional refresh-token hashing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `MAIL_USERNAME` | SMTP username |
| `MAIL_PASSWORD` | SMTP password |
| `APP_PUBLIC_URL` | Public frontend URL for links |
| `APP_CORS_ALLOWED_ORIGINS` | Allowed browser origins |

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
