# Frontend

## 1. Status

Phase 06 established the frontend foundation: design tokens and shared components, the application shell and navigation, a session-aware API client, and the route table with guards. Phase 07 built the public website: home, archive with server-side filters and pagination, event and album pages with an accessible photo viewer, the contributor directory, About, and the sign-in form. Phase 08 adds the member experience: registration, email verification, password recovery, forced password rotation, the contribution upload flow, and dashboard views for uploads, submissions, event suggestions, and the profile. Phase 09 completes administration with the admin shell, photograph moderation queue, governance queues, archive management, and people/oversight pages. Phase 10 begins release hardening with Playwright browser smoke tests and deployment verification. Release hardening also adds report and uploader-removal actions to every published photograph, and event/album/detail correction in the moderation queue.

The frontend is a React 19 single-page application built with Vite and TypeScript. It is organised by feature, and every file that reaches the browser is public: no secret may be placed in `VITE_*` variables.

## 2. Structure

```text
frontend/src/
├── app/
│   ├── App.tsx              error boundary, providers, router, session, scroll reset
│   ├── AppShell.tsx         header, primary/mobile navigation, account menu, footer
│   ├── ErrorBoundary.tsx    last-resort render failure UI
│   ├── RouteFallback.tsx    shared suspense fallback
│   ├── ScrollToTop.tsx      resets scroll on route change
│   ├── providers.tsx        TanStack Query provider
│   ├── router.tsx           lazy route table and guard nesting
│   └── guards/              RequireAuth, RequireRole, RequirePasswordReady
├── components/ui/           design-system primitives
├── components/editorial/    public-archive masthead, section heading, account frame
├── components/domain/       shared domain presentation (status badge and labels)
├── features/
│   ├── about/               public About page
│   ├── account/             registration, verification, and password pages
│   ├── admin/               administration shell, moderation queue, actions, history
│   ├── archive/             archive, event and album pages, queries, gallery components
│   ├── auth/                session provider, sign-in form, account menu
│   ├── contributions/       direct-to-Cloudinary upload flow
│   ├── contributors/        public contributor directory and query
│   ├── dashboard/           member overview, uploads, submissions, suggestions, profile
│   ├── home/                public home page
│   ├── not-found/           unknown-route page
│   └── placeholders/        forbidden route scaffold
├── lib/
│   ├── api/client.ts        fetch transport, bearer token, CSRF, refresh
│   ├── api/accountApi.ts    account lifecycle and profile mutations
│   ├── api/adminApi.ts      administrative moderation and album reads
│   ├── api/archiveApi.ts    public archive reads and query serialization
│   ├── api/contributionApi.ts  own submissions, uploads, and suggestions
│   ├── api/errorMessage.ts  safe failure guidance for member actions
│   ├── api/retry.ts         shared query retry policy
│   ├── api/types.ts         API contract types
│   ├── cloudinary.ts        public image delivery URL builder
│   ├── cloudinaryUpload.ts  signed browser-to-Cloudinary upload
│   ├── config.ts            public application configuration
│   ├── format.ts            archive dates, timestamps, credits, alt text
│   ├── passwordPolicy.ts    client mirror of the server password policy
│   ├── queryClient.ts       TanStack Query defaults
│   └── uploadValidation.ts  file checks and upload limits
├── styles/global.css        Tailwind import, design tokens, base styles
└── test/                    setup, fixtures, and the `renderApp` helper
```

Features own their components, hooks, and tests. Shared `components/ui` primitives stay generic; business rules belong to features or the backend.

## 3. Design system

Semantic tokens are declared in `styles/global.css` with Tailwind's `@theme` block. Components use token names, not raw palette values:

| Token group | Purpose |
|---|---|
| `archive-paper`, `archive-surface` | page and raised surfaces |
| `archive-ink`, `archive-muted` | primary and secondary text |
| `archive-line` | borders and dividers |
| `archive-accent`, `archive-accent-soft` | links, eyebrows, selection |
| `archive-success`, `archive-warning`, `archive-danger`, `archive-info` (+ `-soft`) | status tones |
| `editorial-canvas`, `editorial-surface` | public dark canvas and raised surfaces |
| `editorial-ink`, `editorial-muted`, `editorial-line` | public text and rules |
| `editorial-gold` | the single public accent |

Two scope classes swap the same semantic tokens, so every primitive inherits the
correct palette without per-component theme props:

- `.editorial` (applied by `AppShell`) is the public dark system: canvas `#111111`, ink `#F5F2EA`, muted `#A5A5A5`, gold `#C9A66B`, and charcoal rules. Public pages, authentication, and the contribution flow render here.
- `.workspace` (applied by `DashboardLayout` and `AdminLayout`) restores the light, high-legibility palette for member and administration surfaces. It is a light panel inset inside the editorial shell; workflows and chrome stay operational rather than cinematic.

Typography uses Fraunces for display serif and Inter for UI, loaded from Google Fonts in `index.html` with `display=swap`; both have local Iowan/Palatino and system sans fallbacks so the layout survives a failed font request. Editorial devices are deliberate and finite: oversized serif headlines with tight tracking, wide-tracked uppercase micro-labels, hairline rules, sharp corners, numbered sections (`01`, `02`), and photography-first asymmetric grids. Motion is a short mount rise plus slow image scale on hover, disabled entirely under `prefers-reduced-motion`.

Primitives exported from `components/ui/index.ts`:

- `Button` – primary, secondary, ghost, and danger variants; optional loading state.
- `TextField`, `TextAreaField`, `SelectField` – labelled controls with hint and error wiring.
- `Alert` – inline status or error region.
- `Badge` – compact status label.
- `Card`, `PageHeader`, `EmptyState`, `Skeleton`, `Spinner`.
- `Pagination` – accessible page window with `aria-current`.
- `Dialog` – native modal element with a fallback for engines without `showModal`.

Editorial composition helpers live in `components/editorial/`:

- `EditorialHeader` – public page masthead with eyebrow, oversized title, description, actions, and optional metadata.
- `SectionHeading` – numbered section rule and heading with an optional action.
- `AccountFrame` – split account entry layout used by sign-in and registration.

Component-only style helpers live in their own modules (`buttonStyles.ts`, `inputStyles.ts`, `paginationRange.ts`, `useFieldIds.ts`) so React Fast Refresh keeps working under `--max-warnings=0`.

## 4. Routing and guards

Routes are code-split with `React.lazy`; the shell renders one `Suspense` fallback around the outlet.

| Path | Access | Delivered by |
|---|---|---|
| `/` | Public | Phase 07 |
| `/archive` | Public | Phase 07 |
| `/events/:slug` | Public | Phase 07 |
| `/albums/:slug` | Public | Phase 07 |
| `/contributors` | Public | Phase 07 |
| `/about` | Public | Phase 07 |
| `/sign-in` | Public | Phase 07 (form); Phase 06 session contract |
| `/register` | Public | Phase 08 |
| `/verify-email?token=` | Public | Phase 08 |
| `/forgot-password` | Public | Phase 08 |
| `/reset-password?token=` | Public | Phase 08 |
| `/forbidden` | Public | Phase 06 |
| `/account/password` | Authenticated | Phase 08 |
| `/contribute` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/dashboard` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/dashboard/uploads` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/dashboard/submissions` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/dashboard/suggestions` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/dashboard/profile` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/admin` | `ADMIN`, `SUPER_ADMIN` | Phase 09 — redirects to `/admin/moderation` |
| `/admin/moderation` | `ADMIN`, `SUPER_ADMIN` | Phase 09 |
| `/admin/governance` | `ADMIN`, `SUPER_ADMIN` | Phase 09 |
| `/admin/archive` | `ADMIN`, `SUPER_ADMIN` | Phase 09 |
| `/admin/oversight` | `ADMIN`, `SUPER_ADMIN` | Phase 09 |
| `*` | Public not-found page | Phase 06 |

`RequireAuth` redirects anonymous visitors to `/sign-in` and records the attempted path in router state as `from`. `RequireRole` redirects signed-in users whose role does not match to `/forbidden`. `RequirePasswordReady` nests inside `RequireAuth` and redirects accounts with `passwordChangeRequired` to `/account/password`, which is deliberately outside that guard so the form is reachable. The admin routes nest inside both guards because `PasswordChangeRequiredFilter` also blocks admin APIs.

These guards are a usability affordance only. Every request is authorized again by the API; a modified client cannot widen its permissions.

## 5. Public archive experience

Public reads live in `lib/api/archiveApi.ts` and are issued with `auth: false`, so guests never trigger refresh attempts and stale bearer tokens are not attached.

- `features/archive/queries.ts` wraps event listing, event detail, album detail, academic years, and categories in TanStack Query. `features/contributors/queries.ts` wraps the contributor directory.
- Query failures are retried once, except deterministic `4xx` responses such as a missing event or album, which fail immediately.
- Pages distinguish an empty result from a failure. A `404` event or album renders an explicit "not in the public archive" state; transport failures render an alert with the problem detail. Neither case pretends the archive is empty.
- Filter state lives in the URL: `/archive?q=&year=&category=&featured=&page=`. The URL uses one-based pages for readers while the API remains zero-based. Pagination and filters therefore survive reloads and can be shared.
- `/albums/:slug?page=` paginates approved photographs independently of the event page.
- The album page opens photographs in a native `<dialog>` viewer. Arrow keys move between photographs, Escape closes it, and Previous/Next buttons expose the same actions for pointer and assistive-technology users.
- Every published photograph offers an action. Signed-in members can report a photograph with a category and optional details. The uploader additionally sees "Request removal" because the API marks their own photographs with `viewerCanRequestRemoval`; no other member sees that action. Guests get a sign-in link that returns to the current page. Both actions open confirmation dialogs and never remove the photograph optimistically.
- Album, photo, and recent-photo reads send the in-memory bearer token when one exists, so the removal flag is accurate without making the archive private. Query keys include the viewer identity so a guest's cached payload is never reused after sign-in.
- Photographs are delivered through Cloudinary. `lib/cloudinary.ts` builds `f_auto,q_auto` URLs from the public cloud name, with optional width, height, and `limit`/`fill` cropping. If the cloud name is missing, the UI renders an explicit placeholder rather than requesting an unknown cloud.
- Attribution is always shown. Public photo payloads include ordered photographer credit names (never uploader identity), and every gallery image carries a visible credit line.
- After a member successfully registers their first contribution, the API creates a public contributor profile from the account display name. The Contributors page then lists that profile; this does not infer that the member was the photographer.
- The home page separates recently added photographs, recent events, and academic-year shortcuts. Missing content produces an honest empty state; an unreachable API produces a notice rather than fabricated cards.
- The home page opens with a cinematic typographic hero and a single real archive photograph, then an asymmetric masonry gallery of approved photographs, an editorial event index, academic-year shortcuts, the archive principles, and a contribution call to action. Hero and leading gallery images load eagerly with explicit dimensions; everything else is lazy with Cloudinary `fill` crops sized for its slot, so the page does not shift as images arrive.
- Album and home galleries use CSS columns for a print-like asymmetric rhythm. Each frame keeps its own caption, photographer credit, and report/manage actions; the layout collapses to two columns on phones and one column for album prints where legibility matters.

The sign-in form validates credentials in the browser, posts to `/auth/login`, and continues to the guard-recorded destination. It only accepts same-origin paths as a redirect target, and it returns the same message for an unknown email and a wrong password.

When `VITE_GOOGLE_CLIENT_ID` is set, `GoogleSignInButton` loads Google Identity Services, renders Google's own button, and posts the returned ID token to `/auth/google`. The component renders nothing without a client ID, so local and preview builds without Google credentials look unchanged. The backend remains the only authority on whether a Google account may sign in.

## 6. Member experience

### Account lifecycle

- Registration posts to `/auth/register` and always shows the same guidance: a verification email is sent if the address can be registered. The form does not confirm whether an account already exists.
- Email verification is an explicit button on `/verify-email?token=`. Automatic submission would let mail scanners consume single-use tokens before the member sees the page. The same page can request a new link without revealing whether an unverified account exists.
- Forgot-password always reports that a reset email was sent if an account exists. Reset links are single-use and expire after one hour.
- The browser mirrors the server password policy (`lib/passwordPolicy.ts`) for immediate feedback, including the minimum length, letter and digit requirements, common-password rejection, and rejection of the account email or display name. The API validates every password again and remains authoritative.
- Resetting or changing a password revokes every refresh token server-side. Both flows therefore clear the in-memory session and return to `/sign-in?passwordChanged=1`, rather than leaving a page that will fail on the next refresh.
- A `passwordChangeRequired` account is redirected from contributor routes to `/account/password`. The API enforces the same rule with `PasswordChangeRequiredFilter`; the guard only avoids dead-end requests.

### Dashboard

All dashboard reads are scoped to the authenticated member by the API. The frontend never resolves identifiers against public endpoints, which would fail for unpublished events and albums.

- `GET /me/submissions`, `GET /me/photos`, and `GET /me/event-suggestions` include the display labels the dashboard needs: event and album titles, ordered photographer credits, and suggestion category/year labels.
- Own-photo payloads deliberately contain no delivery URL or Cloudinary identifier. Pending and rejected assets must stay unreachable, so "My uploads" shows metadata, status, and attribution instead of thumbnails.
- Status pills use text as well as colour: pending review, in review, completed, approved, rejected, flagged, hidden, removed, and withdrawn.
- Removal requests are created from an own upload with a free-text reason. The page marks the request pending for the rest of the session. There is no user-facing list of own removal requests yet, so after a reload the server's `409` remains the source of truth for an existing open request.
- Event suggestions can be created with optional category, academic year, date, and description. The list shows the reviewer's decision and note when present.
- Profile edits use `PATCH /me` and replace the cached user through `AuthContext.setUser`, so the account menu updates without another session refresh. Email changes are not offered because ownership verification belongs to the archive office.

### Contribution upload flow

`/contribute` creates one submission batch and uploads its files sequentially:

1. Choose a published event and, optionally, one of its albums.
2. Add files to a queue. The browser checks extension, MIME type, size (15 MB), and the 50-photo batch limit; the server repeats every check.
3. For each file, enter the photographer credit explicitly. The upload button refuses to start until every item has one. A batch helper can copy a single credit into empty rows, but it never overwrites an individual credit and never treats the uploader as the photographer.
4. On submit, `POST /me/submissions` creates the batch. Then, per file, the page requests `POST /me/uploads/authorize`, posts the bytes directly to Cloudinary with `credentials: 'omit'` and no archive bearer token or cookie, and registers the returned public ID with `POST /me/submissions/{id}/photos`.
5. Each item reports its own state. Failed items keep the saved submission and can be retried individually; retries request a fresh single-use authorization rather than reusing an expired one.
6. Registered photographs start `PENDING`. Nothing becomes public until moderation approves it.

Upload authorization, signing, and asset verification remain server-side. The frontend never receives the Cloudinary API secret and never chooses the asset identifier beyond echoing the server-issued public ID. When Cloudinary is not configured in development, authorization fails and the page reports the failure honestly instead of simulating success.

### Administration

Phase 09 adds the complete administration workspace.

- `/admin` renders `AdminLayout`, which links only implemented sections (currently Moderation) and redirects its index route to `/admin/moderation`.
- The queue keeps its state in the URL: `/admin/moderation?status=&page=`. A missing `status` means pending review, `status=ALL` lists every state, and pages are one-based for readers while the API stays zero-based.
- Each queue card shows the event and album labels, uploader display name, dimensions, format, size, dates, and ordered photographer credits. The API also returns `cloudinaryPublicId` for this role-protected read model, so the card can render the same delivery helper as the public gallery. If the deployment has no Cloudinary cloud name, the card shows a placeholder instead of a broken image. The identifier never appears in public or `/me` responses.
- Available action buttons are derived from a local mirror of the server transition table (`moderationActions.ts`). The API re-validates every transition and returns `409` on a race; the UI reports the problem detail rather than assuming success.
- Approval opens a filing panel rather than a single album prompt: the event, its album, title, caption, and alternative text are pre-filled from the photograph and can all be corrected before the decision is recorded. Choosing another event reloads its albums and requires a new album choice, because the album decides the photograph's event. The dialog validates that both are present and reports the server's problem detail on failure.
- Every queue card also offers "Edit details", which re-files or retitles a photograph without changing its moderation status. The API records the change in the audit log.
- Every other action requires a reason. Reasons and filing choices are validated in the dialog, then recorded by the API in moderation history and the audit log.
- Moderation history loads on demand per photograph, not for every card, and shows the actor, role, transition, reason, and date.
- A successful action closes the dialog, clears stale queue/history queries, and shows a confirmation notice. Nothing is removed from the DOM as if it had succeeded before the server responded.
- The governance queues render the photograph itself, not just an identifier: each report or removal request shows the image preview, title, event and album, uploader, format, dimensions, upload date, and the current photograph status. Reports can be filtered by status, category, and event; removal requests by status and event. Both filters combine and are kept in the URL.
- Administrators also get a role-gated "Manage" control on home-page cards, album tiles, the public photo viewer, and governance queue cards. It loads `GET /admin/photos/{id}` on demand, offers only transitions the current status accepts (flag, hide, remove, restore), and exposes the same Edit details dialog as the moderation queue. Every action refreshes the archive queries so a hidden or removed photograph disappears immediately, and every request is authorized again by the API.

## 7. Session and API client

`lib/api/client.ts` is the only transport for API calls.

- The access token is held in a module-level variable. It is never written to `localStorage`, `sessionStorage`, or a readable cookie.
- Requests default to `credentials: 'include'` and `Accept: application/json`.
- Authenticated requests attach `Authorization: Bearer <token>`.
- The refresh token stays in the API's `HttpOnly` cookie; JavaScript cannot read it.
- A `401` on an authenticated request triggers one refresh attempt and one retry. Public calls (`auth: false`) and callers that opt out never retry.
- Concurrent refreshes share a single in-flight promise, so several failing queries rotate the cookie once.
- CSRF pairs from `GET /auth/csrf` are cached in memory and attached as the returned header (currently `X-XSRF-TOKEN`) for cookie-authenticated calls such as refresh and logout.
- Logout revokes the token family and clears the in-memory token, CSRF cache, and any in-flight refresh.
- Errors surface as `ApiError` with the HTTP status and the RFC 9457 `ProblemDetail` payload when present.

`AuthProvider` restores a session on mount by refreshing the cookie. Anonymous visitors therefore cost two requests at startup (`/auth/csrf` then `/auth/refresh`) and receive a normal anonymous UI. Login posts credentials, stores the returned access token in memory, and updates context state.

TanStack Query owns server-state caching; interactivity and form state stay local. React Hook Form and Zod are available for the larger forms delivered in later phases; the sign-in form uses Zod directly.

## 8. Accessibility

- The shell provides a skip link, one `main` landmark, labelled navigation regions, and a visible focus ring.
- The mobile navigation and account menu are disclosure buttons with `aria-expanded` and `aria-controls`; the account menu also closes on outside pointer input.
- Forms pair every control with a label, hint, and error through `aria-describedby`, and mark invalid controls with `aria-invalid`.
- Errors use `role="alert"`; other status messages use `role="status"` and result counts use `aria-live="polite"`.
- Archive filters are a labelled form; selects apply immediately and the title search submits explicitly.
- The photo viewer relies on the native `<dialog>` modal stack for focus trapping and Escape handling, and exposes Previous/Next as real buttons as well as arrow-key shortcuts.
- Gallery images use their alt text, then the photograph title, then a neutral archival fallback. Decorative marks are hidden from assistive technology.
- `Pagination` exposes `aria-current="page"` and labelled page buttons.
- Global styles respect `prefers-reduced-motion` and only enable smooth scrolling when motion is allowed.
- Colour is never the only signal: statuses also carry text.

## 9. Testing

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e:install
npm run e2e
```

Vitest with jsdom and React Testing Library covers:

- API transport: bearer injection, CSRF caching, 401 refresh and retry, no-retry rules, single-flight refresh, logout.
- Archive API: filter serialization, blank-filter omission, slug encoding, public requests without a bearer token.
- Auth provider and sign-in: session restore, anonymous fallback, validation, login, redirect handling, non-enumerating error messages, logout, cached-user replacement, and local session clearing.
- Shell and routing: identity, primary and mobile navigation, account menu, not-found page, guard redirects for anonymous users, members, administrators, and super administrators, plus the forced-password-change gate.
- Account lifecycle: registration policy and generic success, explicit email verification, expired-token handling and resend, forgot-password non-enumeration, reset completion, forced password change with session clearing, and the sign-in notice.
- Member dashboard: summary counts and recent activity, own upload metadata and photographer credits, removal requests with reasons, submission tracking, suggestion creation and validation, and profile updates through `setUser`.
- Administration: guarded admin routes and index redirect, pending queue reads with archive context, URL-driven status filters, empty and error states, reason-required rejection, event/album/detail correction during approval and afterwards, and lazy moderation history.
- Governance: report, removal-request, and event-suggestion queues with photo previews and context, status/category/event filters, and recorded resolutions.
- Public-page administration: role-gated manage control on archive photographs for editing details, flagging, hiding, removing, and restoring.
- Archive management: create academic years, categories, draft events, and draft albums; publish or unpublish events.
- People and oversight: searchable user directory, status changes, super-admin-only role changes, operational analytics, and paginated audit activity.
- Contribution flow: event selection, file queue, required photographer credits, submission creation, signed Cloudinary upload, photo registration, and per-item retry after a failed upload.
- Contribution helpers: password policy mirror, upload format/size validation, and Cloudinary upload request construction, identifier checking, error reporting, and network failure handling.
- Public pages: home sections and failure notice, archive listing/filtering/pagination/empty/error states, event metadata and album links, album attribution and not-found state, contributor directory without account details.
- Public photograph actions: guest sign-in prompt, report submission with category and details, uploader-only removal request, and uploader eligibility flags in fixtures.
- Photo viewer: opening, visible attribution, keyboard navigation, and Escape.
- Presentation helpers: timezone-safe event dates, credit joining, alt-text fallback, Cloudinary delivery URLs and missing-configuration behaviour.
- Design-system primitives: button loading state, field accessibility wiring, dialog open/close, pagination windowing, alert roles.
- Playwright browser smoke tests: public shell/navigation, honest empty archive state, anonymous admin redirect, and keyboard focus visibility.

`src/test/renderApp.tsx` renders the real shell and route table with a stubbed `AuthContext`. `src/test/setup.ts` installs a well-formed empty-archive `fetch` stub before each test; tests that need data replace it. Component tests must await lazy routes with `findBy*` queries.

## 10. Deferred work

- Phase 09 is complete. Future work can improve bulk operations, richer editing forms, and dedicated detail views without changing the authorization boundary.
- Phase 10 remaining work: real backend/SMTP/Cloudinary end-to-end journeys, visual regression coverage, deployment smoke checks, and static security analysis.
- A user-facing list of own removal requests; the API currently supports creation only.
- Contributor profile claiming and profile-edit permissions.
- Standalone photograph pages and social preview metadata for shared links (later phase).
- Playwright end-to-end coverage, including a real Cloudinary upload run, and visual regression checks (Phase 10).

## 11. Configuration

`VITE_API_BASE_URL` defaults to `/api/v1`. Development uses the Vite proxy to `http://localhost:8080`; production uses the same-origin `/api` rewrite described in `docs/DECISIONS.md` (ADR-0004).

`VITE_CLOUDINARY_CLOUD_NAME` is the public Cloudinary cloud name used for image delivery. It is not a secret. When it is empty, galleries show an explicit "delivery is not configured" placeholder instead of a broken image. Uploads do not read any `VITE_*` Cloudinary value: the API issues the cloud name, key, signature, preset, and public ID per authorization.

See `frontend/.env.example`. Never put API keys or secrets in `VITE_*` variables.
