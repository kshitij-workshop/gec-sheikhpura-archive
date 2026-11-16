import type { PageResponse } from '../lib/api/types'

export function requestPath(input: RequestInfo | URL): string {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

  return raw.split('?')[0] ?? raw
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function pageOf<T>(items: T[] = [], overrides: Partial<PageResponse<T>> = {}): PageResponse<T> {
  return {
    items,
    page: 0,
    size: 24,
    totalElements: items.length,
    totalPages: items.length > 0 ? 1 : 0,
    ...overrides,
  }
}

/**
 * Default network stub for component tests: an empty but well-formed public
 * archive. Keeping the shape valid prevents noisy failures in unrelated tests.
 */
export function defaultFetchStub(input: RequestInfo | URL): Promise<Response> {
  const path = requestPath(input)

  if (path.endsWith('/academic-years') || path.endsWith('/categories')) {
    return Promise.resolve(jsonResponse([]))
  }
  if (path.endsWith('/public-stats/visits')) {
    return Promise.resolve(new Response(null, { status: 204 }))
  }
  if (path.endsWith('/public-stats')) {
    return Promise.resolve(
      jsonResponse({
        totalVisitors: 0,
        visitorsToday: 0,
        registeredUsers: 0,
        activeUsers: 0,
        generatedAt: '2026-01-01T00:00:00Z',
      }),
    )
  }
  if (
    path.endsWith('/contributors') ||
    path.endsWith('/events') ||
    path.includes('/albums/')
  ) {
    return Promise.resolve(jsonResponse(pageOf()))
  }

  return Promise.resolve(
    jsonResponse({ title: 'Not Found', status: 404 }, 404),
  )
}
