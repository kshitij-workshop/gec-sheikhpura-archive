import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../features/auth/useAuth'
import type { PersistedRole } from '../../lib/api/types'
import { RouteFallback } from '../RouteFallback'

/**
 * Usability guard only. The API enforces every role rule server-side; a
 * tampered client cannot widen its own permissions.
 */
export function RequireRole({ roles }: { roles: readonly PersistedRole[] }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <RouteFallback label="Checking your permissions" />
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

  if (!roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
