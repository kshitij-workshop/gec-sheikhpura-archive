import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  makeEvent,
  makeYear,
} from '../../test/archiveFixtures'
import { jsonResponse, pageOf, requestPath } from '../../test/fetchStub'
import { renderApp } from '../../test/renderApp'

function stubHome(options: { eventsFail?: boolean } = {}) {
  const featured = makeEvent()
  const latest = makeEvent({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Sports Day',
    slug: 'sports-day',
    featured: false,
  })

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input)
      const url = String(input)

      if (options.eventsFail && path.endsWith('/events')) {
        return Promise.resolve(
          jsonResponse({ title: 'Unavailable', detail: 'Offline.' }, 404),
        )
      }
      if (path.endsWith('/academic-years')) {
        return Promise.resolve(jsonResponse([makeYear()]))
      }
      if (path.endsWith('/events')) {
        return Promise.resolve(
          jsonResponse(
            url.includes('featured=true')
              ? pageOf([featured])
              : pageOf([latest]),
          ),
        )
      }

      return Promise.resolve(jsonResponse({ title: 'Not Found' }, 404))
    }),
  )
}

describe('HomePage', () => {
  it('shows featured events, recent additions, and academic years', async () => {
    stubHome()

    renderApp({ path: '/' })

    expect(
      await screen.findByRole('link', { name: 'Founders Day' }),
    ).toHaveAttribute('href', '/events/founders-day')
    expect(screen.getByRole('link', { name: 'Sports Day' })).toHaveAttribute(
      'href',
      '/events/sports-day',
    )
    expect(
      screen.getByRole('link', { name: 'All featured events' }),
    ).toHaveAttribute('href', '/archive?featured=true')
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
      screen.queryByText('Featured events are being prepared'),
    ).not.toBeInTheDocument()
  })
})
