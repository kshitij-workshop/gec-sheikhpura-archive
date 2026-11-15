import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { makeEvent } from '../../test/archiveFixtures'
import { jsonResponse, requestPath } from '../../test/fetchStub'
import { renderApp } from '../../test/renderApp'

describe('EventPage', () => {
  it('renders event metadata and its published albums', async () => {
    const event = makeEvent()
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const path = requestPath(input)
        if (path.includes('/events/slug/founders-day')) {
          return Promise.resolve(jsonResponse(event))
        }
        return Promise.resolve(jsonResponse({ title: 'Not Found' }, 404))
      }),
    )

    renderApp({ path: '/events/founders-day' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Founders Day' }),
    ).toBeInTheDocument()
    expect(screen.getByText('14 February 2026')).toBeInTheDocument()
    expect(screen.getByText('Main Campus')).toBeInTheDocument()
    expect(screen.getAllByText('2025-2026').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: /Annual Sports Day/ }),
    ).toHaveAttribute('href', '/albums/annual-sports-day')
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(trail).getByRole('link', { name: 'Archive' })).toHaveAttribute(
      'href',
      '/archive',
    )
  })

  it('explains that an unpublished event is not public', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            { title: 'Not Found', detail: 'Event not found.' },
            404,
          ),
        ),
      ),
    )

    renderApp({ path: '/events/hidden-event' })

    expect(
      await screen.findByText('This event is not in the public archive'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Browse the archive' }),
    ).toHaveAttribute('href', '/archive')
  })
})
