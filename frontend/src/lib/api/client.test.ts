import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  apiRequest,
  clearSession,
  getAccessToken,
  logoutSession,
  refreshAccessToken,
  setAccessToken,
} from './client'
import type { TokenResponse, User } from './types'

const user: User = {
  id: '3f1c2b4a-0000-4000-8000-000000000001',
  email: 'asha.verma@example.edu',
  displayName: 'Asha Verma',
  role: 'USER',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-01-05T10:00:00Z',
  createdAt: '2025-12-20T10:00:00Z',
  passwordChangeRequired: false,
}

const tokenResponse: TokenResponse = {
  accessToken: 'fresh-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user,
}

function jsonResponse(
  body: unknown,
  status = 200,
  contentType = 'application/json',
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': contentType },
  })
}

function fetchUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input.toString()
}

afterEach(() => {
  clearSession()
  vi.unstubAllGlobals()
})

describe('apiRequest transport', () => {
  it('requests the versioned API with cookies included', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ status: string }>('/events')).resolves.toEqual({
      status: 'ok',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/events',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    )
  })

  it('attaches the in-memory bearer token', async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('memory-only-token')

    await apiRequest('/me')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer memory-only-token',
        }),
      }),
    )
  })

  it('omits the bearer token for public auth calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(tokenResponse))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('should-not-leak')

    await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: user.email, password: 'secret' },
      auth: false,
    })

    const [, init] = fetchMock.mock.calls[0] ?? []
    const headers = (init as RequestInit).headers as Record<string, string>

    expect(headers.Authorization).toBeUndefined()
  })

  it('serializes JSON request bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: '123' }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/reports', { method: 'POST', body: { reason: 'spam' } })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'spam' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('returns undefined for empty 204 responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/session', { method: 'DELETE' }),
    ).resolves.toBeUndefined()
  })

  it('throws ApiError with the parsed ProblemDetail payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          detail: 'You may not moderate this submission.',
        },
        403,
        'application/problem+json',
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/photos/1/approve', { method: 'POST' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'You may not moderate this submission.',
      problem: { title: 'Forbidden' },
    })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('Service unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const error = await apiRequest('/health').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 503,
      message: 'Request failed with status 503',
      problem: undefined,
    })
  })
})

describe('csrf-protected cookie endpoints', () => {
  it('fetches a CSRF pair once and reuses it', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >((input) => {
      const url = fetchUrl(input)
      if (url.endsWith('/auth/csrf')) {
        return Promise.resolve(
          jsonResponse({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }),
        )
      }
      return Promise.resolve(jsonResponse({ ok: true }))
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/reports', { method: 'POST', csrf: true, body: {} })
    await apiRequest('/reports', { method: 'POST', csrf: true, body: {} })

    const csrfCalls = fetchMock.mock.calls.filter(([input]) =>
      fetchUrl(input).endsWith('/auth/csrf'),
    )
    expect(csrfCalls).toHaveLength(1)

    const reportCall = fetchMock.mock.calls.find(([input]) =>
      fetchUrl(input).endsWith('/reports'),
    )
    expect(reportCall?.[1]).toMatchObject({
      headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'csrf-token' }),
    })
  })

  it('clears the cached pair and token on logout', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.endsWith('/auth/csrf')) {
        return Promise.resolve(
          jsonResponse({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }),
        )
      }
      return Promise.resolve(new Response(null, { status: 204 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('memory-only-token')

    await logoutSession()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'csrf-token',
        }),
      }),
    )
    expect(getAccessToken()).toBeNull()
  })
})

describe('session refresh', () => {
  it('refreshes on 401 and retries the original request once', async () => {
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = fetchUrl(input)

        if (url.endsWith('/auth/csrf')) {
          return Promise.resolve(
            jsonResponse({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }),
          )
        }
        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(jsonResponse(tokenResponse))
        }

        const headers = init?.headers as Record<string, string> | undefined
        if (headers?.Authorization === 'Bearer fresh-access-token') {
          return Promise.resolve(jsonResponse({ id: user.id }))
        }
        return Promise.resolve(
          jsonResponse({ title: 'Unauthorized', status: 401 }, 401),
        )
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ id: string }>('/me')).resolves.toEqual({
      id: user.id,
    })

    expect(getAccessToken()).toBe('fresh-access-token')
  })

  it('shares a single refresh between concurrent 401 responses', async () => {
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = fetchUrl(input)

        if (url.endsWith('/auth/csrf')) {
          return Promise.resolve(
            jsonResponse({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }),
          )
        }
        if (url.endsWith('/auth/refresh')) {
          return Promise.resolve(jsonResponse(tokenResponse))
        }

        const headers = init?.headers as Record<string, string> | undefined
        if (headers?.Authorization === 'Bearer fresh-access-token') {
          return Promise.resolve(jsonResponse({ ok: true }))
        }
        return Promise.resolve(
          jsonResponse({ title: 'Unauthorized', status: 401 }, 401),
        )
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([
      apiRequest('/me/submissions'),
      apiRequest('/me/reports'),
    ])

    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      fetchUrl(input).endsWith('/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
  })

  it('does not retry public auth calls', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ title: 'Unauthorized', status: 401 }, 401),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/auth/login', {
        method: 'POST',
        body: { email: user.email, password: 'wrong' },
        auth: false,
      }),
    ).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('honours an explicit retry opt-out', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ title: 'Unauthorized', status: 401 }, 401),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest('/me', { retryOnUnauthorized: false }),
    ).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null when the refresh cookie is missing', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.endsWith('/auth/csrf')) {
        return Promise.resolve(
          jsonResponse({ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }),
        )
      }
      return Promise.resolve(new Response(null, { status: 401 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })
})
