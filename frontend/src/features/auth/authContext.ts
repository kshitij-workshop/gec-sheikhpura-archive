import { createContext } from 'react'

import type { LoginInput, User } from '../../lib/api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthState {
  status: AuthStatus
  user: User | null
  /** Credentialed login; throws `ApiError` on invalid credentials. */
  login: (input: LoginInput) => Promise<void>
  /** Revokes the refresh family and clears local state. */
  logout: () => Promise<void>
  /** Replaces the cached user after a profile or account update. */
  setUser: (user: User) => void
  /**
   * Drops the in-memory session without calling the API. Used after actions
   * that already revoke refresh tokens server-side, such as a password change.
   */
  clearSession: () => void
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
