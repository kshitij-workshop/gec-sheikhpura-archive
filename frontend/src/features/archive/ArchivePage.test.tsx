import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  jsonResponse,
  pageOf,
  requestPath,
} from '../../test/fetchStub'
import {
  makeCategory,
  makeEvent,
  makeYear,
} from '../../test/archiveFixtures'
import { renderApp } from '../../test/renderApp'

type FetchMock = ReturnType<typeof vi.fn>

function stubArchive(
  events: ReturnType<typeof makeEvent>[] = [makeEvent(), makeEvent({
    id: '77777777-7777-4777-8777-777777777777',
    title: 'Sports Day',
    slug: 'sports-day',
    featured: false,
  })],
  page = pageOf(events, { totalElements: events.length, totalPages: 1 }),
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = requestPath(input)

    if (path.endsWith('/academic-years')) {
      return Promise.resolve(jsonResponse([makeYear()]))
    }
    if (path.endsWith('/categories')) {
      return Promise.resolve(jsonResponse([makeCategory()]))
    }
    if (path.endsWith('/events')) {
      return Promise.resolve(jsonResponse(page))
    }

    return Promise.resolve(jsonResponse({ title: 'Not Found' }, 404))
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function lastEventsUrl(fetchMock: FetchMock): string {
  const calls = fetchMock.mock.calls.filter((call) =>
    String(call[0]).includes('/events'),
  )
  const last = calls.at(-1)?.[0]

  return typeof last === 'string' ? last : String(last)
}

describe('ArchivePage', () => {
  it('lists published events and exposes the filter controls', async () => {
    stubArchive()

    renderApp({ path: '/archive' })

    expect(
      await screen.findByRole('link', { name: 'Founders Day' }),
    ).toHaveAttribute('href', '/events/founders-day')
    expect(screen.getByRole('link', { name: 'Sports Day' })).toHaveAttribute(
      'href',
      '/events/sports-day',
    )
    expect(screen.getByText('2 events')).toBeInTheDocument()
    expect(screen.getByLabelText('Academic year')).toHaveValue('')
    expect(
      screen.getByRole('option', { name: '2025-2026' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sports' })).toBeInTheDocument()
  })

  it('submits a title search while keeping the other filters', async () => {
    const user = userEvent.setup()
    const year = makeYear()
    const fetchMock = stubArchive()

    renderApp({ path: `/archive?year=${year.id}` })

    await screen.findByRole('link', { name: 'Founders Day' })
    await user.type(screen.getByLabelText('Search events'), 'founders')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(lastEventsUrl(fetchMock)).toContain('query=founders')
    })
    expect(lastEventsUrl(fetchMock)).toContain(`academicYearId=${year.id}`)
  })

  it('requests the second page through the one-based URL parameter', async () => {
    const user = userEvent.setup()
    const events = [makeEvent()]
    const fetchMock = stubArchive(
      events,
      pageOf(events, { totalElements: 25, totalPages: 2 }),
    )

    renderApp({ path: '/archive' })

    await screen.findByRole('link', { name: 'Founders Day' })
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(lastEventsUrl(fetchMock)).toContain('page=1')
    })
  })

  it('shows an empty state when no event matches', async () => {
    stubArchive([], pageOf([]))

    renderApp({ path: '/archive?q=unknown' })

    expect(
      await screen.findByText('No events match these filters'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }).length,
    ).toBeGreaterThan(0)
  })

  it('does not blame filters when the archive is simply empty', async () => {
    stubArchive([], pageOf([]))

    renderApp({ path: '/archive' })

    expect(
      await screen.findByText('The archive is just getting started'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('No events match these filters'),
    ).not.toBeInTheDocument()
  })

  it('reports an archive failure without pretending it is empty', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = requestPath(input)

      if (path.endsWith('/events')) {
        return Promise.resolve(
          jsonResponse(
            { title: 'Archive unavailable', detail: 'Archive service is offline.' },
            404,
          ),
        )
      }

      return Promise.resolve(jsonResponse([]))
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp({ path: '/archive' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The archive could not be loaded')
    expect(alert).toHaveTextContent('Archive service is offline.')
    expect(
      screen.queryByText('No events match these filters'),
    ).not.toBeInTheDocument()
  })
})
