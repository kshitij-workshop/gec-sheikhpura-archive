import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  refreshAccessToken,
  setAccessToken,
  logoutSession,
  clearSession as clearApiSession,
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
    try {
      await logoutSession()
    } finally {
      setSession({ status: 'anonymous', user: null })
    }
  }, [])

  const clearSession = useCallback(() => {
    clearApiSession()
    setSession({ status: 'anonymous', user: null })
  }, [])

  const setUser = useCallback((user: User) => {
    setSession((current) =>
      current.status === 'authenticated'
        ? { ...current, user }
        : current,
    )
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      status: session.status,
      user: session.user,
      login,
      logout,
      setUser,
      clearSession,
    }),
    [session, login, logout, setUser, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
