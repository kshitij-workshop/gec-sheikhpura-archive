import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../lib/api/client'
import { anonymousAuth, makeAuth } from '../../test/renderApp'
import type { AuthState } from './authContext'
import { AuthContext } from './authContext'
import { GoogleSignInButton } from './GoogleSignInButton'

interface FakeInitializeOptions {
  client_id: string
  callback: (response: { credential?: string }) => void
}

/** Installs the subset of the Google Identity Services global we rely on. */
function installGoogleIdentity(credential: string | undefined) {
  const calls: FakeInitializeOptions[] = []
  const initialize = vi.fn((options: FakeInitializeOptions) => {
    calls.push(options)
  })
  const renderButton = vi.fn((parent: HTMLElement) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Sign in with Google'
    button.addEventListener('click', () => {
      calls.at(-1)?.callback({ credential })
    })
    parent.appendChild(button)
  })

  ;(window as unknown as { google?: unknown }).google = {
    accounts: { id: { initialize, renderButton } },
  }

  return { initialize, renderButton }
}

function renderGoogleButton(auth: AuthState, props = {}) {
  const onSuccess = vi.fn()
  const onError = vi.fn()

  render(
    <AuthContext.Provider value={auth}>
      <GoogleSignInButton onSuccess={onSuccess} onError={onError} {...props} />
    </AuthContext.Provider>,
  )

  return { onSuccess, onError }
}

afterEach(() => {
  delete (window as unknown as { google?: unknown }).google
  vi.unstubAllEnvs()
})

describe('GoogleSignInButton', () => {
  it('renders nothing when the deployment has no client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')

    const { container } = render(
      <AuthContext.Provider value={anonymousAuth}>
        <GoogleSignInButton onSuccess={vi.fn()} onError={vi.fn()} />
      </AuthContext.Provider>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('initialises Google Identity Services with the configured client id', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '1234-example.apps.googleusercontent.com')
    const { initialize, renderButton } = installGoogleIdentity('google-id-token')

    renderGoogleButton(anonymousAuth)

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledTimes(1)
    })
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: '1234-example.apps.googleusercontent.com',
        ux_mode: 'popup',
      }),
    )
    expect(renderButton).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByRole('button', { name: 'Sign in with Google' }),
    ).toBeInTheDocument()
  })

  it('exchanges the Google credential for an archive session', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '1234-example.apps.googleusercontent.com')
    installGoogleIdentity('google-id-token')
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined)
    const { onSuccess } = renderGoogleButton(
      makeAuth({ status: 'anonymous', loginWithGoogle }),
    )

    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Sign in with Google' }),
    )

    await waitFor(() => {
      expect(loginWithGoogle).toHaveBeenCalledWith('google-id-token')
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('explains a refused account without leaking details', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '1234-example.apps.googleusercontent.com')
    installGoogleIdentity('google-id-token')
    const loginWithGoogle = vi.fn().mockRejectedValue(
      new ApiError(409, {
        detail: 'This email address is already connected to another Google account.',
      }),
    )
    const { onError, onSuccess } = renderGoogleButton(
      makeAuth({ status: 'anonymous', loginWithGoogle }),
    )

    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Sign in with Google' }),
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'This email address is already connected to another Google account.',
      )
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('treats an unconfigured backend as a friendly message', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '1234-example.apps.googleusercontent.com')
    installGoogleIdentity('google-id-token')
    const loginWithGoogle = vi
      .fn()
      .mockRejectedValue(new ApiError(503, { title: 'Service unavailable' }))
    const { onError } = renderGoogleButton(
      makeAuth({ status: 'anonymous', loginWithGoogle }),
    )

    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Sign in with Google' }),
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'Google sign-in is not available on this archive yet. Use your email and password instead.',
      )
    })
  })

  it('reports a missing credential instead of signing in', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '1234-example.apps.googleusercontent.com')
    installGoogleIdentity(undefined)
    const loginWithGoogle = vi.fn()
    const { onError } = renderGoogleButton(
      makeAuth({ status: 'anonymous', loginWithGoogle }),
    )

    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Sign in with Google' }),
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'Google did not return a sign-in credential. Please try again.',
      )
    })
    expect(loginWithGoogle).not.toHaveBeenCalled()
  })
})
