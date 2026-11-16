import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../lib/api/client'
import {
  anonymousAuth,
  authForRole,
  makeAuth,
  renderApp,
} from '../../test/renderApp'
import type { AuthState } from './authContext'
import { AuthContext } from './authContext'
import SignInPage from './SignInPage'

function renderSignIn(auth: AuthState = anonymousAuth, from?: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/sign-in', state: from ? { from } : null },
      ]}
    >
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/contribute" element={<p>Contribute page</p>} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('SignInPage', () => {
  it('validates the form before calling the API', async () => {
    const user = userEvent.setup()
    const login = vi.fn()
    renderSignIn(makeAuth({ login }))

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('signs in and continues to the remembered destination', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue(undefined)
    renderSignIn(makeAuth({ login }), '/contribute')

    await user.type(
      screen.getByLabelText('Email address'),
      '  asha.verma@example.edu ',
    )
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'asha.verma@example.edu',
        password: 'correct horse battery',
      })
    })
    expect(await screen.findByText('Contribute page')).toBeInTheDocument()
  })

  it('falls back to the dashboard for an unsafe redirect target', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue(undefined)
    renderSignIn(makeAuth({ login }), 'https://evil.example/steal')

    await user.type(screen.getByLabelText('Email address'), 'asha@example.edu')
    await user.type(screen.getByLabelText('Password'), 'correct horse battery')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('does not reveal whether an email address exists', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue(new ApiError(401))
    renderSignIn(makeAuth({ login }))

    await user.type(screen.getByLabelText('Email address'), 'asha@example.edu')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Email or password is incorrect.'),
    ).toBeInTheDocument()
  })

  it('shows the active session instead of the form', async () => {
    renderApp({ path: '/sign-in', auth: authForRole('USER') })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'You are signed in' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Go to your dashboard' }),
    ).toHaveAttribute('href', '/dashboard')
  })

  it('hides Google sign-in when the deployment has no client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')

    renderSignIn()

    expect(screen.queryByText('or use your email')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sign in with Google' }),
    ).not.toBeInTheDocument()

    vi.unstubAllEnvs()
  })

  it('offers Google sign-in beside the email form when configured', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '1234-example.apps.googleusercontent.com')
    const calls: Array<{ callback: (response: { credential?: string }) => void }> = []
    ;(window as unknown as { google?: unknown }).google = {
      accounts: {
        id: {
          initialize: (options: { callback: (response: { credential?: string }) => void }) => {
            calls.push(options)
          },
          renderButton: (parent: HTMLElement) => {
            const button = document.createElement('button')
            button.type = 'button'
            button.textContent = 'Sign in with Google'
            button.addEventListener('click', () => {
              calls.at(-1)?.callback({ credential: 'google-id-token' })
            })
            parent.appendChild(button)
          },
        },
      },
    }
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined)

    try {
      renderSignIn(makeAuth({ loginWithGoogle }), '/contribute')

      expect(await screen.findByText('or use your email')).toBeInTheDocument()
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: 'Sign in with Google' }))

      await waitFor(() => {
        expect(loginWithGoogle).toHaveBeenCalledWith('google-id-token')
      })
      expect(await screen.findByText('Contribute page')).toBeInTheDocument()
    } finally {
      delete (window as unknown as { google?: unknown }).google
      vi.unstubAllEnvs()
    }
  })
})
