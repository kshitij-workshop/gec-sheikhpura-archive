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
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
