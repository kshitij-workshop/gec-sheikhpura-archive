import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../features/auth/useAuth'
import { RouteFallback } from '../RouteFallback'

/**
 * Keeps accounts that must replace a temporary password away from contributor
 * pages until they do. The API enforces the same rule with
 * `PasswordChangeRequiredFilter`; this redirect only avoids dead-end requests.
 */
export function RequirePasswordReady() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <RouteFallback label="Checking your account" />
  }

  if (status === 'anonymous' || user === null) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (user.passwordChangeRequired) {
    return <Navigate to="/account/password" replace />
  }

  return <Outlet />
}
