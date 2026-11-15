# Frontend

## 1. Status

Phase 06 established the frontend foundation: design tokens and shared components, the application shell and navigation, a session-aware API client, and the route table with guards. Phase 07 builds the public website on that foundation: home, archive with server-side filters and pagination, event and album pages with an accessible photo viewer, the contributor directory, About, and the sign-in form. Contribution, dashboard, and administration pages remain placeholders for Phases 08–09.

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
│   └── guards/              RequireAuth and RequireRole
├── components/ui/           design-system primitives
├── features/
│   ├── about/               public About page
│   ├── archive/             archive, event and album pages, queries, gallery components
│   ├── auth/                session provider, sign-in form, account menu
│   ├── contributors/        public contributor directory and query
│   ├── home/                public home page
│   ├── not-found/           unknown-route page
│   └── placeholders/        contribution and dashboard route scaffolds
├── lib/
│   ├── api/client.ts        fetch transport, bearer token, CSRF, refresh
│   ├── api/archiveApi.ts    public archive reads and query serialization
│   ├── api/retry.ts         shared query retry policy
│   ├── api/types.ts         API contract types
│   ├── cloudinary.ts        public image delivery URL builder
│   ├── config.ts            public application configuration
│   ├── format.ts            archive dates, timestamps, credits, alt text
│   └── queryClient.ts       TanStack Query defaults
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

Editorial tone: serif display headings, restrained uppercase eyebrows, generous whitespace, and a warm paper background rather than pure white.

Primitives exported from `components/ui/index.ts`:

- `Button` – primary, secondary, ghost, and danger variants; optional loading state.
- `TextField`, `TextAreaField`, `SelectField` – labelled controls with hint and error wiring.
- `Alert` – inline status or error region.
- `Badge` – compact status label.
- `Card`, `PageHeader`, `EmptyState`, `Skeleton`, `Spinner`.
- `Pagination` – accessible page window with `aria-current`.
- `Dialog` – native modal element with a fallback for engines without `showModal`.

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
| `/forbidden` | Public | Phase 06 |
| `/contribute` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/dashboard` | `USER`, `ADMIN`, `SUPER_ADMIN` | Phase 08 |
| `/admin` | `ADMIN`, `SUPER_ADMIN` | Phase 09 |
| `*` | Public not-found page | Phase 06 |

`RequireAuth` redirects anonymous visitors to `/sign-in` and records the attempted path in router state as `from`. `RequireRole` redirects signed-in users whose role does not match to `/forbidden`.

These guards are a usability affordance only. Every request is authorized again by the API; a modified client cannot widen its permissions.

## 5. Public archive experience

Public reads live in `lib/api/archiveApi.ts` and are issued with `auth: false`, so guests never trigger refresh attempts and stale bearer tokens are not attached.

- `features/archive/queries.ts` wraps event listing, event detail, album detail, academic years, and categories in TanStack Query. `features/contributors/queries.ts` wraps the contributor directory.
- Query failures are retried once, except deterministic `4xx` responses such as a missing event or album, which fail immediately.
- Pages distinguish an empty result from a failure. A `404` event or album renders an explicit "not in the public archive" state; transport failures render an alert with the problem detail. Neither case pretends the archive is empty.
- Filter state lives in the URL: `/archive?q=&year=&category=&featured=&page=`. The URL uses one-based pages for readers while the API remains zero-based. Pagination and filters therefore survive reloads and can be shared.
- `/albums/:slug?page=` paginates approved photographs independently of the event page.
- The album page opens photographs in a native `<dialog>` viewer. Arrow keys move between photographs, Escape closes it, and Previous/Next buttons expose the same actions for pointer and assistive-technology users.
- Photographs are delivered through Cloudinary. `lib/cloudinary.ts` builds `f_auto,q_auto` URLs from the public cloud name, with optional width, height, and `limit`/`fill` cropping. If the cloud name is missing, the UI renders an explicit placeholder rather than requesting an unknown cloud.
- Attribution is always shown. Public photo payloads include ordered photographer credit names (never uploader identity), and every gallery image carries a visible credit line.
- The home page separates featured events, recent additions, and academic-year shortcuts. Missing content produces an honest empty state; an unreachable API produces a notice rather than fabricated cards.

The sign-in form validates credentials in the browser, posts to `/auth/login`, and continues to the guard-recorded destination. It only accepts same-origin paths as a redirect target, and it returns the same message for an unknown email and a wrong password.

## 6. Session and API client

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

## 7. Accessibility

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

## 8. Testing

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

Vitest with jsdom and React Testing Library covers:

- API transport: bearer injection, CSRF caching, 401 refresh and retry, no-retry rules, single-flight refresh, logout.
- Archive API: filter serialization, blank-filter omission, slug encoding, public requests without a bearer token.
- Auth provider and sign-in: session restore, anonymous fallback, validation, login, redirect handling, non-enumerating error messages, logout.
- Shell and routing: identity, primary and mobile navigation, account menu, not-found page, guard redirects for anonymous users, members, administrators, and super administrators.
- Public pages: home sections and failure notice, archive listing/filtering/pagination/empty/error states, event metadata and album links, album attribution and not-found state, contributor directory without account details.
- Photo viewer: opening, visible attribution, keyboard navigation, and Escape.
- Presentation helpers: timezone-safe event dates, credit joining, alt-text fallback, Cloudinary delivery URLs and missing-configuration behaviour.
- Design-system primitives: button loading state, field accessibility wiring, dialog open/close, pagination windowing, alert roles.

`src/test/renderApp.tsx` renders the real shell and route table with a stubbed `AuthContext`. `src/test/setup.ts` installs a well-formed empty-archive `fetch` stub before each test; tests that need data replace it. Component tests must await lazy routes with `findBy*` queries.

## 9. Deferred work

- Registration, email verification, and password-reset pages (Phase 08).
- Submission upload, tracking, and profile management (Phase 08).
- Moderation, governance, and analytics dashboards (Phase 09).
- Standalone photograph pages and social preview metadata for shared links (later phase).
- Playwright end-to-end coverage and visual regression checks (Phase 10).

## 10. Configuration

`VITE_API_BASE_URL` defaults to `/api/v1`. Development uses the Vite proxy to `http://localhost:8080`; production uses the same-origin `/api` rewrite described in `docs/DECISIONS.md` (ADR-0004).

`VITE_CLOUDINARY_CLOUD_NAME` is the public Cloudinary cloud name used for image delivery. It is not a secret. When it is empty, galleries show an explicit "delivery is not configured" placeholder instead of a broken image.

See `frontend/.env.example`. Never put API keys or secrets in `VITE_*` variables.
