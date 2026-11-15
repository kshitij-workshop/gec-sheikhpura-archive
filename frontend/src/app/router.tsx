import { lazy } from 'react'
import { Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { RequireAuth } from './guards/RequireAuth'
import { RequirePasswordReady } from './guards/RequirePasswordReady'
import { RequireRole } from './guards/RequireRole'

const HomePage = lazy(() => import('../features/home/HomePage'))
const NotFoundPage = lazy(() => import('../features/not-found/NotFoundPage'))
const ArchivePage = lazy(() => import('../features/archive/ArchivePage'))
const EventPage = lazy(() => import('../features/archive/EventPage'))
const AlbumPage = lazy(() => import('../features/archive/AlbumPage'))
const ContributorsPage = lazy(
  () => import('../features/contributors/ContributorsPage'),
)
const AboutPage = lazy(() => import('../features/about/AboutPage'))
const ContributePage = lazy(
  () => import('../features/contributions/ContributePage'),
)
const SignInPage = lazy(() => import('../features/auth/SignInPage'))
const RegisterPage = lazy(() => import('../features/account/RegisterPage'))
const VerifyEmailPage = lazy(
  () => import('../features/account/VerifyEmailPage'),
)
const ForgotPasswordPage = lazy(
  () => import('../features/account/ForgotPasswordPage'),
)
const ResetPasswordPage = lazy(
  () => import('../features/account/ResetPasswordPage'),
)
const ChangePasswordPage = lazy(
  () => import('../features/account/ChangePasswordPage'),
)
const DashboardLayout = lazy(
  () => import('../features/dashboard/DashboardLayout'),
)
const DashboardPage = lazy(
  () => import('../features/dashboard/DashboardPage'),
)
const MyUploadsPage = lazy(
  () => import('../features/dashboard/MyUploadsPage'),
)
const SubmissionsPage = lazy(
  () => import('../features/dashboard/SubmissionsPage'),
)
const SuggestionsPage = lazy(
  () => import('../features/dashboard/SuggestionsPage'),
)
const ProfilePage = lazy(() => import('../features/dashboard/ProfilePage'))
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
        <Route path="events/:slug" element={<EventPage />} />
        <Route path="albums/:slug" element={<AlbumPage />} />
        <Route path="contributors" element={<ContributorsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth />}>
          {/* Reachable while a password change is still required. */}
          <Route path="account/password" element={<ChangePasswordPage />} />

          <Route element={<RequirePasswordReady />}>
            <Route path="contribute" element={<ContributePage />} />
            <Route path="dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="uploads" element={<MyUploadsPage />} />
              <Route path="submissions" element={<SubmissionsPage />} />
              <Route path="suggestions" element={<SuggestionsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
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
