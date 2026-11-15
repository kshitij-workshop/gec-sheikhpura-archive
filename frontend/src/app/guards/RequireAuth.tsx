import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '../../features/auth/useAuth'
import { RouteFallback } from '../RouteFallback'

/** Redirects anonymous visitors to sign-in, remembering the target path. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <RouteFallback label="Checking your session" />
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
