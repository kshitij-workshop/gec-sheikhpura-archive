import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { AppProviders } from '../app/providers'
import { AppRoutes } from '../app/router'
import { AuthContext } from '../features/auth/authContext'
import type { AuthState } from '../features/auth/authContext'
import type { PersistedRole, User } from '../lib/api/types'

export const anonymousAuth: AuthState = {
  status: 'anonymous',
  user: null,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '3f1c2b4a-0000-4000-8000-000000000001',
    email: 'asha.verma@example.edu',
    displayName: 'Asha Verma',
    role: 'USER',
    status: 'ACTIVE',
    emailVerifiedAt: '2026-01-05T10:00:00Z',
    createdAt: '2025-12-20T10:00:00Z',
    passwordChangeRequired: false,
    ...overrides,
  }
}

export function makeAuth(overrides: Partial<AuthState> = {}): AuthState {
  return { ...anonymousAuth, ...overrides }
}

export function authForRole(role: PersistedRole): AuthState {
  return makeAuth({ status: 'authenticated', user: makeUser({ role }) })
}

export interface RenderAppOptions {
  path?: string
  auth?: AuthState
}

/**
 * Renders the real shell and route table with a stubbed session, so routing,
 * guards, and navigation can be exercised without touching the network.
 */
export function renderApp({
  path = '/',
  auth = anonymousAuth,
}: RenderAppOptions = {}): RenderResult {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={auth}>
          <AppRoutes />
        </AuthContext.Provider>
      </MemoryRouter>
    </AppProviders>,
  )
}
