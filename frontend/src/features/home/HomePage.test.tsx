import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  makeEvent,
  makeRecentPhoto,
  makeYear,
} from '../../test/archiveFixtures'
import { jsonResponse, pageOf, requestPath } from '../../test/fetchStub'
import { renderApp } from '../../test/renderApp'

function stubHome(options: { eventsFail?: boolean } = {}) {
  const latest = makeEvent({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Sports Day',
    slug: 'sports-day',
    featured: false,
  })
  const photo = makeRecentPhoto()

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input)

      if (path.endsWith('/public-stats/visits')) {
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (path.endsWith('/public-stats')) {
        return Promise.resolve(
          jsonResponse({
            totalVisitors: 1234,
            visitorsToday: 12,
            registeredUsers: 87,
            activeUsers: 3,
            generatedAt: '2026-11-16T00:00:00Z',
          }),
        )
      }
      if (options.eventsFail && path.endsWith('/events')) {
        return Promise.resolve(
          jsonResponse({ title: 'Unavailable', detail: 'Offline.' }, 404),
        )
      }
      if (path.endsWith('/academic-years')) {
        return Promise.resolve(jsonResponse([makeYear()]))
      }
      if (path.endsWith('/photos')) {
        return Promise.resolve(jsonResponse(pageOf([photo])))
      }
      if (path.endsWith('/events')) {
        return Promise.resolve(jsonResponse(pageOf([latest])))
      }

      return Promise.resolve(jsonResponse({ title: 'Not Found' }, 404))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('HomePage', () => {
  it('shows recently added photographs, recent events, and academic years', async () => {
    stubHome()

    renderApp({ path: '/' })

    expect(
      await screen.findByRole('link', { name: /Opening ceremony/ }),
    ).toHaveAttribute('href', '/albums/annual-sports-day')
    expect(screen.getByRole('link', { name: 'Sports Day' })).toHaveAttribute(
      'href',
      '/events/sports-day',
    )
    expect(
      screen.getByRole('link', { name: 'Browse the archive' }),
    ).toHaveAttribute('href', '/archive')
    expect(
      screen.getByRole('link', { name: '2025-2026' }),
    ).toHaveAttribute('href', `/archive?year=${makeYear().id}`)
  })

  it('degrades to an honest notice when the archive cannot be reached', async () => {
    stubHome({ eventsFail: true })

    renderApp({ path: '/' })

    expect(
      await screen.findByText('The archive is temporarily unavailable'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No photographs published yet'),
    ).not.toBeInTheDocument()
  })

  it('shows archive activity in the footer', async () => {
    stubHome()

    renderApp({ path: '/' })

    const footer = screen.getByRole('contentinfo')
    await waitFor(() =>
      expect(footer).toHaveTextContent('1,234 visitors'),
    )
    expect(footer).toHaveTextContent('12 today')
    expect(footer).toHaveTextContent('87 members')
    expect(footer).toHaveTextContent('3 signed in')
    expect(footer).toHaveTextContent(
      'Preserved with care by the college community.',
    )
  })

  it('keeps footer counters out of the page body', async () => {
    stubHome()

    renderApp({ path: '/' })

    await screen.findByRole('link', { name: /Opening ceremony/ })

    expect(screen.queryByText('Archive visitors')).not.toBeInTheDocument()
    expect(screen.queryByText('Visitors today')).not.toBeInTheDocument()
    expect(screen.queryByText('Registered members')).not.toBeInTheDocument()
  })
})
