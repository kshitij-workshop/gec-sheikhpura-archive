import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  refreshAccessToken,
  setAccessToken,
  logoutSession,
} from '../../lib/api/client'
import type { LoginInput, User } from '../../lib/api/types'
import { loginRequest } from './authApi'
import { AuthContext } from './authContext'
import type { AuthState, AuthStatus } from './authContext'

interface SessionState {
  status: AuthStatus
  user: User | null
}

/**
 * Restores a session from the `HttpOnly` refresh cookie on mount and exposes
 * login/logout. The access token itself never leaves memory.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    status: 'loading',
    user: null,
  })

  useEffect(() => {
    let active = true

    void (async () => {
      const restored = await refreshAccessToken()

      if (!active) {
        return
      }

      setSession(
        restored
          ? { status: 'authenticated', user: restored.user }
          : { status: 'anonymous', user: null },
      )
    })()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginRequest(input)
    setAccessToken(response.accessToken)
    setSession({ status: 'authenticated', user: response.user })
  }, [])

  const logout = useCallback(async () => {
    await logoutSession()
    setSession({ status: 'anonymous', user: null })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      status: session.status,
      user: session.user,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
