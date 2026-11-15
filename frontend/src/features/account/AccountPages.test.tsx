import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../lib/api/client'
import {
  authForRole,
  makeAuth,
  makeUser,
  renderApp,
} from '../../test/renderApp'
import {
  changePassword,
  registerAccount,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../../lib/api/accountApi'

async function waitForHeading(name: string) {
  await screen.findByRole('heading', { level: 1, name })
}

vi.mock('../../lib/api/accountApi', () => ({
  registerAccount: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillRegistration(
  user: ReturnType<typeof userEvent.setup>,
  password = 'ArchivePass1234',
) {
  await user.type(screen.getByLabelText('Display name'), 'Asha Verma')
  await user.type(screen.getByLabelText('Email address'), 'asha@example.edu')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), password)
}

describe('registration', () => {
  it('checks the password policy before calling the API', async () => {
    const user = userEvent.setup()
    renderApp({ path: '/register' })
    await waitForHeading('Create your account')

    await fillRegistration(user, 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Use at least 12 characters.'),
    ).toBeInTheDocument()
    expect(registerAccount).not.toHaveBeenCalled()
  })

  it('registers the account and explains the verification step', async () => {
    const user = userEvent.setup()
    vi.mocked(registerAccount).mockResolvedValue({
      message:
        'If the address can be registered, a verification email has been sent.',
    })
    renderApp({ path: '/register' })
    await waitForHeading('Create your account')

    await fillRegistration(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(registerAccount).toHaveBeenCalledWith({
      displayName: 'Asha Verma',
      email: 'asha@example.edu',
      password: 'ArchivePass1234',
    })
    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Resend verification email' }),
    ).toHaveAttribute('href', '/verify-email')
  })
})

describe('email verification', () => {
  it('verifies the token from the email link', async () => {
    const user = userEvent.setup()
    vi.mocked(verifyEmail).mockResolvedValue(undefined)
    renderApp({ path: '/verify-email?token=verify-token' })
    await waitForHeading('Verify your email')

    await user.click(screen.getByRole('button', { name: 'Verify my email' }))

    expect(verifyEmail).toHaveBeenCalledWith('verify-token')
    expect(
      await screen.findByText('Your email is verified'),
    ).toBeInTheDocument()
  })

  it('reports an expired token and still offers a new link', async () => {
    const user = userEvent.setup()
    vi.mocked(verifyEmail).mockRejectedValue(
      new ApiError(400, { detail: 'This link is invalid or has expired.' }),
    )
    vi.mocked(resendVerification).mockResolvedValue({
      message:
        'If an unverified account exists, a new verification email has been sent.',
    })
    renderApp({ path: '/verify-email?token=expired' })
    await waitForHeading('Verify your email')

    await user.click(screen.getByRole('button', { name: 'Verify my email' }))

    expect(
      await screen.findByText('This link is invalid or has expired.'),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Email address'),
      'asha@example.edu',
    )
    await user.click(screen.getByRole('button', { name: 'Send new link' }))

    expect(resendVerification).toHaveBeenCalledWith('asha@example.edu')
    expect(await screen.findByText('Request received')).toBeInTheDocument()
  })
})

describe('password recovery', () => {
  it('never reveals whether an address has an account', async () => {
    const user = userEvent.setup()
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message:
        'If an account exists for that address, a password reset email has been sent.',
    })
    renderApp({ path: '/forgot-password' })
    await waitForHeading('Forgot your password?')

    await user.type(
      screen.getByLabelText('Email address'),
      'unknown@example.edu',
    )
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(requestPasswordReset).toHaveBeenCalledWith('unknown@example.edu')
    expect(
      await screen.findByText(
        'If an account exists for that address, a password reset email has been sent.',
      ),
    ).toBeInTheDocument()
  })

  it('sets a new password with the reset token', async () => {
    const user = userEvent.setup()
    vi.mocked(resetPassword).mockResolvedValue(undefined)
    renderApp({ path: '/reset-password?token=reset-token' })
    await waitForHeading('Choose a new password')

    await user.type(screen.getByLabelText('New password'), 'ArchivePass1234')
    await user.type(
      screen.getByLabelText('Confirm password'),
      'ArchivePass1234',
    )
    await user.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'ArchivePass1234',
    })
    expect(await screen.findByText('Password reset')).toBeInTheDocument()
  })

  it('asks for a new link when the token is missing', async () => {
    renderApp({ path: '/reset-password' })

    expect(
      await screen.findByText('This link is incomplete'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Request a new link' }),
    ).toHaveAttribute('href', '/forgot-password')
  })
})

describe('password change', () => {
  it('clears the local session after the server revokes refresh tokens', async () => {
    const user = userEvent.setup()
    const clearSession = vi.fn()
    vi.mocked(changePassword).mockResolvedValue(undefined)

    renderApp({
      path: '/account/password',
      auth: makeAuth({
        status: 'authenticated',
        user: makeUser({ passwordChangeRequired: true }),
        clearSession,
      }),
    })
    await waitForHeading('Change your password')

    await user.type(
      screen.getByLabelText('Current password'),
      'TemporaryPass1234',
    )
    await user.type(screen.getByLabelText('New password'), 'ArchivePass1234')
    await user.type(
      screen.getByLabelText('Confirm password'),
      'ArchivePass1234',
    )
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'TemporaryPass1234',
      newPassword: 'ArchivePass1234',
    })
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByRole('heading', { name: 'You are signed in' }),
    ).toBeInTheDocument()
  })
})

describe('sign-in notices', () => {
  it('confirms a completed password change', async () => {
    renderApp({ path: '/sign-in?passwordChanged=1' })

    expect(await screen.findByText('Password changed')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/register')
    expect(
      screen.getByRole('link', { name: 'Forgot your password?' }),
    ).toHaveAttribute('href', '/forgot-password')
  })

  it('shows the active session instead of the form', async () => {
    renderApp({
      path: '/sign-in',
      auth: authForRole('USER'),
    })

    expect(
      await screen.findByRole('heading', { name: 'You are signed in' }),
    ).toBeInTheDocument()
  })
})
