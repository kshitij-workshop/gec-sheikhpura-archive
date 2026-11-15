import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { RequireAuth } from './guards/RequireAuth'
import { RequireRole } from './guards/RequireRole'

const HomePage = lazy(() => import('../features/home/HomePage'))
const NotFoundPage = lazy(() => import('../features/not-found/NotFoundPage'))
const ArchivePage = lazy(
  () => import('../features/placeholders/ArchivePage'),
)
const ContributorsPage = lazy(
  () => import('../features/placeholders/ContributorsPage'),
)
const AboutPage = lazy(() => import('../features/placeholders/AboutPage'))
const ContributePage = lazy(
  () => import('../features/placeholders/ContributePage'),
)
const SignInPage = lazy(() => import('../features/placeholders/SignInPage'))
const DashboardPage = lazy(
  () => import('../features/placeholders/DashboardPage'),
)
const AdminPage = lazy(() => import('../features/placeholders/AdminPage'))
const ForbiddenPage = lazy(
  () => import('../features/placeholders/ForbiddenPage'),
)

/**
 * Route table for the archive.
 *
 * Guards here are usability affordances only: every protected API call is
 * authorized again on the server. Pages are code-split so the public shell
 * loads without dashboard or admin bundles.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="contributors" element={<ContributorsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth />}>
          <Route path="contribute" element={<ContributePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>

        <Route
          element={<RequireRole roles={['ADMIN', 'SUPER_ADMIN']} />}
        >
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
