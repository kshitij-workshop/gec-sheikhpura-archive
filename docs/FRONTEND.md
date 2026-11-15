# Frontend

## 1. Status

Phase 06 establishes the frontend foundation: design tokens and shared components, the application shell and navigation, a session-aware API client, and the route table with guards. Feature pages are intentionally placeholders until Phases 07–09.

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
│   ├── auth/                session provider, auth API, account menu
│   ├── home/                public home page
│   ├── not-found/           unknown-route page
│   └── placeholders/        route scaffolds delivered in later phases
├── lib/
│   ├── api/client.ts        fetch transport, bearer token, CSRF, refresh
│   ├── api/types.ts         API contract types
│   ├── config.ts            public application configuration
│   └── queryClient.ts       TanStack Query defaults
├── styles/global.css        Tailwind import, design tokens, base styles
└── test/                    setup and the `renderApp` test helper
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
| `/` | Public | Phase 06 |
| `/archive` | Public | Phase 07 |
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

## 5. Session and API client

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

TanStack Query owns server-state caching; interactivity and form state stay local. React Hook Form and Zod are available for the forms delivered in later phases.

## 6. Accessibility

- The shell provides a skip link, one `main` landmark, labelled navigation regions, and a visible focus ring.
- The mobile navigation and account menu are disclosure buttons with `aria-expanded` and `aria-controls`; the account menu also closes on outside pointer input.
- Forms pair every control with a label, hint, and error through `aria-describedby`, and mark invalid controls with `aria-invalid`.
- Errors use `role="alert"`; other status messages use `role="status"`.
- `Dialog` relies on the native `<dialog>` modal stack for focus trapping and Escape handling.
- Global styles respect `prefers-reduced-motion` and only enable smooth scrolling when motion is allowed.
- Colour is never the only signal: statuses also carry text.

## 7. Testing

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

Vitest with jsdom and React Testing Library covers:

- API transport: bearer injection, CSRF caching, 401 refresh and retry, no-retry rules, single-flight refresh, logout.
- Auth provider: session restore, anonymous fallback, login, logout.
- Shell and routing: identity, primary and mobile navigation, account menu, not-found page, guard redirects for anonymous users, members, administrators, and super administrators.
- Design-system primitives: button loading state, field accessibility wiring, dialog open/close, pagination windowing, alert roles.

`src/test/renderApp.tsx` renders the real shell and route table with a stubbed `AuthContext`, so navigation tests never touch the network. Component tests must await lazy routes with `findBy*` queries.

## 8. Deferred work

- Sign-in, registration, and password flows (Phase 07).
- Public archive browsing and contributor pages (Phase 07).
- Submission upload, tracking, and profile management (Phase 08).
- Moderation, governance, and analytics dashboards (Phase 09).
- Playwright end-to-end coverage and visual regression checks (Phase 10).

## 9. Configuration

`VITE_API_BASE_URL` defaults to `/api/v1`. Development uses the Vite proxy to `http://localhost:8080`; production uses the same-origin `/api` rewrite described in `docs/DECISIONS.md` (ADR-0004). See `frontend/.env.example`.
