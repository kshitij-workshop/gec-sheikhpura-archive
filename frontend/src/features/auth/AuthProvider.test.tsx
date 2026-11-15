import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  logoutSession,
  refreshAccessToken,
  setAccessToken,
} from '../../lib/api/client'
import type { TokenResponse } from '../../lib/api/types'
import { loginRequest } from './authApi'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

vi.mock('../../lib/api/client', () => ({
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  logoutSession: vi.fn(),
}))

vi.mock('./authApi', () => ({
  loginRequest: vi.fn(),
}))

const session: TokenResponse = {
  accessToken: 'fresh-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    id: '3f1c2b4a-0000-4000-8000-000000000001',
    email: 'asha.verma@example.edu',
    displayName: 'Asha Verma',
    role: 'USER',
    status: 'ACTIVE',
    emailVerifiedAt: '2026-01-05T10:00:00Z',
    createdAt: '2025-12-20T10:00:00Z',
    passwordChangeRequired: false,
  },
}

function SessionProbe() {
  const { status, user, login, logout } = useAuth()

  return (
    <div>
      <p>status:{status}</p>
      <p>user:{user?.displayName ?? 'none'}</p>
      <button
        type="button"
        onClick={() => {
          void login({ email: 'asha.verma@example.edu', password: 'secret' })
        }}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={() => {
          void logout()
        }}
      >
        Log out
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthProvider', () => {
  it('restores a session from the refresh cookie on mount', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue(session)

    renderProvider()

    expect(await screen.findByText('status:authenticated')).toBeInTheDocument()
    expect(screen.getByText('user:Asha Verma')).toBeInTheDocument()
  })

  it('falls back to anonymous when no refresh cookie exists', async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue(null)

    renderProvider()

    expect(await screen.findByText('status:anonymous')).toBeInTheDocument()
    expect(screen.getByText('user:none')).toBeInTheDocument()
  })

  it('stores a login response in memory and state', async () => {
    const user = userEvent.setup()
    vi.mocked(refreshAccessToken).mockResolvedValue(null)
    vi.mocked(loginRequest).mockResolvedValue(session)

    renderProvider()
    await screen.findByText('status:anonymous')

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(loginRequest).toHaveBeenCalledWith({
      email: 'asha.verma@example.edu',
      password: 'secret',
    })
    expect(setAccessToken).toHaveBeenCalledWith('fresh-access-token')
    expect(await screen.findByText('status:authenticated')).toBeInTheDocument()
  })

  it('revokes the session on logout', async () => {
    const user = userEvent.setup()
    vi.mocked(refreshAccessToken).mockResolvedValue(session)
    vi.mocked(logoutSession).mockResolvedValue()

    renderProvider()
    await screen.findByText('status:authenticated')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(logoutSession).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('status:anonymous')).toBeInTheDocument()
  })
})
