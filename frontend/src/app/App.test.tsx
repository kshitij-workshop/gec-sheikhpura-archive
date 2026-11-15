import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  anonymousAuth,
  authForRole,
  makeAuth,
  makeUser,
  renderApp,
} from '../test/renderApp'

describe('application shell', () => {
  it('renders the archive identity and primary navigation', async () => {
    renderApp()

    expect(
      await screen.findByRole('link', { name: /GEC Sheikhpura Archive/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      await screen.findByRole('link', { name: 'Explore the archive' }),
    ).toHaveAttribute('href', '/archive')
  })

  it('renders the home page content', async () => {
    renderApp()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /photographic memory of the college/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Featured events' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Recently added' }),
    ).toBeInTheDocument()
  })

  it('exposes a skip link to the main landmark', async () => {
    renderApp()

    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  it('opens and closes the mobile navigation disclosure', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByRole('heading', { level: 1 })

    expect(
      screen.queryByRole('navigation', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))

    expect(
      screen.getByRole('navigation', { name: 'Mobile navigation' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close navigation' }))

    expect(
      screen.queryByRole('navigation', { name: 'Mobile navigation' }),
    ).not.toBeInTheDocument()
  })

  it('offers sign-in to anonymous visitors', async () => {
    renderApp()

    const signInLinks = await screen.findAllByRole('link', { name: 'Sign in' })

    expect(signInLinks.length).toBeGreaterThan(0)
    for (const link of signInLinks) {
      expect(link).toHaveAttribute('href', '/sign-in')
    }
  })

  it('shows the account menu for the signed-in member', async () => {
    const user = userEvent.setup()
    renderApp({
      auth: makeAuth({ status: 'authenticated', user: makeUser() }),
    })

    await user.click(
      await screen.findByRole('button', {
        name: 'Account menu for Asha Verma',
      }),
    )

    expect(screen.getByText('asha.verma@example.edu')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
    expect(
      screen.queryByRole('link', { name: 'Administration' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
  })

  it('links administrators to the admin area', async () => {
    const user = userEvent.setup()
    renderApp({
      auth: authForRole('ADMIN'),
    })

    await user.click(
      await screen.findByRole('button', {
        name: 'Account menu for Asha Verma',
      }),
    )

    expect(
      screen.getByRole('link', { name: 'Administration' }),
    ).toHaveAttribute('href', '/admin')
  })

  it('renders a not-found page for unknown routes', async () => {
    renderApp({ path: '/missing-page' })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /not in the archive/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})

describe('route guards', () => {
  it('redirects anonymous visitors from the dashboard to sign-in', async () => {
    renderApp({ path: '/dashboard', auth: anonymousAuth })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeInTheDocument()
  })

  it('redirects anonymous visitors from the admin area to sign-in', async () => {
    renderApp({ path: '/admin', auth: anonymousAuth })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeInTheDocument()
  })

  it('allows members into the dashboard', async () => {
    renderApp({ path: '/dashboard', auth: authForRole('USER') })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your dashboard',
      }),
    ).toBeInTheDocument()
  })

  it('contains accounts that must change a temporary password', async () => {
    renderApp({
      path: '/dashboard',
      auth: makeAuth({
        status: 'authenticated',
        user: makeUser({ passwordChangeRequired: true }),
      }),
    })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Change your password',
      }),
    ).toBeInTheDocument()
  })

  it('keeps the password form reachable during a forced change', async () => {
    renderApp({
      path: '/account/password',
      auth: makeAuth({
        status: 'authenticated',
        user: makeUser({ passwordChangeRequired: true }),
      }),
    })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Change your password',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Password change required'),
    ).toBeInTheDocument()
  })

  it('sends members away from the admin area', async () => {
    renderApp({ path: '/admin', auth: authForRole('USER') })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /do not have access/i,
      }),
    ).toBeInTheDocument()
  })

  it('allows administrators into the admin area', async () => {
    renderApp({ path: '/admin', auth: authForRole('ADMIN') })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Moderation queue',
      }),
    ).toBeInTheDocument()
  })

  it('allows super administrators into the admin area', async () => {
    renderApp({ path: '/admin', auth: authForRole('SUPER_ADMIN') })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Moderation queue',
      }),
    ).toBeInTheDocument()
  })

  it('keeps administrators with a temporary password out of the admin area', async () => {
    renderApp({
      path: '/admin/moderation',
      auth: makeAuth({
        status: 'authenticated',
        user: makeUser({ role: 'ADMIN', passwordChangeRequired: true }),
      }),
    })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Change your password',
      }),
    ).toBeInTheDocument()
  })
})
