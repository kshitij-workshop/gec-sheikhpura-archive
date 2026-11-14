# AGENTS.md — Engineering and Agent Rules

This file is the working contract for humans and AI agents contributing to the GEC Sheikhpura Archive.

## Source of truth

Before starting any task:

1. Read the master project prompt.
2. Read the relevant files in `docs/`.
3. Inspect the repository and current Git state.
4. Understand the current phase and dependencies.
5. State the proposed change, affected files, risks, and verification plan.

Do not build the whole application in one operation. Work on one clearly defined task at a time.

## Non-negotiable product rules

- Exactly four roles exist: `GUEST`, `USER`, `ADMIN`, `SUPER_ADMIN`.
- `GUEST` is an unauthenticated security state. Never store `GUEST` as a user's persisted role.
- Users may upload photographs, suggest events, track their submissions, update their profile, request removal of eligible submissions, and report photographs.
- Only `ADMIN` and `SUPER_ADMIN` may moderate content.
- Only `SUPER_ADMIN` may promote or demote administrators and super administrators.
- No one may promote themselves.
- Uploader and photographer are different concepts. Never auto-assign the uploader as photographer.
- Every community submission enters moderation before publication.
- Public APIs return only approved photographs from published, non-deleted albums and events.
- Never implement facial recognition or automatic student identification.

## Architecture rules

- Modular monolith. No microservices, Kubernetes, Redis, or Elasticsearch without a demonstrated requirement and owner approval.
- Organize backend code by business domain: `auth`, `user`, `event`, `album`, `photo`, `moderation`, `category`, `contributor`, `report`, `analytics`, `audit`, `common`.
- Organize frontend code by feature, not one giant components directory.
- Keep controllers thin. Business logic belongs in services.
- Use DTOs for API requests and responses. Never expose JPA entities.
- Enforce authorization and resource ownership on the backend. Frontend route guards are usability only.
- Use UTC timestamps and `timestamptz` in PostgreSQL.
- Use Flyway for every schema change. Never use `ddl-auto=update` in production.
- Prefer explicit transaction boundaries.
- Do not add dependencies without a concrete need.

## Security invariants

- Never commit secrets, credentials, private keys, or production connection strings.
- Never store long-lived tokens in `localStorage`.
- Never trust client-provided authorization, URLs, public IDs, or image metadata.
- Validate and authorize every state-changing request on the server.
- Use secure, `HttpOnly` cookies for refresh tokens and protect cookie-based endpoints against CSRF.
- Use explicit CORS allowlists. Never use wildcard origins with credentials.
- Verify Cloudinary assets server-side before creating photo records.
- Pending/private submissions must not be exposed through public APIs or public image URLs.
- Log sensitive administrative actions to an append-only audit log.
- Do not log passwords, tokens, secrets, or unnecessary personal data.
- Report security concerns to the project owner instead of silently working around them.

## Backend commands

```bash
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
cd backend
./mvnw -B verify
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Integration tests use Testcontainers and require Docker Desktop to be running.

## Frontend commands

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run dev
```

## Database commands

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres
```

Never delete the local database volume without explicit approval.

## Testing expectations

- Add or update tests for every meaningful behavior change.
- Backend: JUnit, Mockito, MockMvc, Testcontainers where integration behavior matters.
- Frontend: Vitest and React Testing Library for behavior; Playwright for end-to-end flows.
- Critical security tests are mandatory:
  - Guests cannot access private submissions.
  - Users cannot approve photographs or moderate content.
  - Users cannot modify another user's submissions.
  - Admins cannot promote themselves to super admin.
  - Rejected photographs never appear publicly.
  - Unverified Cloudinary assets cannot become published records.
  - Public endpoints do not expose private metadata.
- Never claim a test passed unless it was actually executed. Report failures and skipped checks honestly.

## Git expectations

- Use focused feature branches.
- Keep commits atomic and messages meaningful.
- Never commit `.env` files or generated build output.
- Never force-push `main`.
- Do not overwrite uncommitted user changes.
- Do not perform destructive Git operations without approval.
- Review diffs before committing.

## Definition of done

A task is complete only when:

1. The implementation is finished within the requested scope.
2. Relevant tests are written and actually executed.
3. Lint, typecheck, and build pass where applicable.
4. Security and data-integrity implications are reviewed.
5. Documentation is updated when contracts or architecture change.
6. The final report includes:
   - implementation summary
   - modified files
   - technical explanation
   - tests executed and actual results
   - security considerations
   - remaining issues
   - manual verification steps
   - suggested commit message

## Phase discipline

Follow the phases in the master project prompt. Do not start a later phase without explicit approval. Do not quietly expand scope. If a requirement is ambiguous, ask one focused question rather than making a major assumption.
