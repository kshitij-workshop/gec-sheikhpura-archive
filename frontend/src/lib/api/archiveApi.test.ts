import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchAcademicYears,
  fetchAlbumBySlug,
  fetchCategories,
  fetchContributors,
  fetchEventBySlug,
  fetchEvents,
} from './archiveApi'
import { clearSession, setAccessToken } from './client'
import { pageOf, jsonResponse } from '../../test/fetchStub'

function stubFetch(body: unknown = pageOf()) {
  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockImplementation(() => Promise.resolve(jsonResponse(body)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestedUrl(
  fetchMock: ReturnType<typeof stubFetch>,
): string {
  const call = fetchMock.mock.calls.at(-1)
  const input = call?.[0]

  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input?.url ?? '')
}

afterEach(() => {
  clearSession()
  vi.unstubAllGlobals()
})

describe('public archive API', () => {
  it('serializes every event filter into the query string', async () => {
    const fetchMock = stubFetch()

    await fetchEvents({
      page: 2,
      size: 12,
      query: 'sports day',
      academicYearId: 'year-1',
      categoryId: 'category-1',
      featured: true,
    })

    expect(requestedUrl(fetchMock)).toBe(
      '/api/v1/events?page=2&size=12&query=sports+day&academicYearId=year-1&categoryId=category-1&featured=true',
    )
  })

  it('omits blank filters and never sends a bearer token', async () => {
    const fetchMock = stubFetch()
    setAccessToken('memory-only-token')

    await fetchEvents({ query: '  ', academicYearId: '' })

    expect(requestedUrl(fetchMock)).toBe('/api/v1/events')
    const init = fetchMock.mock.calls.at(-1)?.[1]
    const headers = init?.headers as Record<string, string>
    expect(init?.credentials).toBe('include')
    expect(headers.Authorization).toBeUndefined()
  })

  it('encodes slugs and album pagination', async () => {
    const fetchMock = stubFetch({})

    await fetchEventBySlug('founders/day')
    expect(requestedUrl(fetchMock)).toBe('/api/v1/events/slug/founders%2Fday')

    await fetchAlbumBySlug('sports day', 1, 12)
    expect(requestedUrl(fetchMock)).toBe(
      '/api/v1/albums/slug/sports%20day?page=1&size=12',
    )
  })

  it('requests the public facets and contributor directory', async () => {
    const fetchMock = stubFetch([])

    await fetchAcademicYears()
    expect(requestedUrl(fetchMock)).toBe('/api/v1/academic-years')

    await fetchCategories()
    expect(requestedUrl(fetchMock)).toBe('/api/v1/categories')

    await fetchContributors(1, 24)
    expect(requestedUrl(fetchMock)).toBe(
      '/api/v1/contributors?page=1&size=24',
    )
  })
})
