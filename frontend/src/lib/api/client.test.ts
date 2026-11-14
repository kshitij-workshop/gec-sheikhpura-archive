import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from './client'

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': contentType },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/session', { method: 'DELETE' })).resolves.toBeUndefined()
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

    await expect(apiRequest('/photos/1/approve', { method: 'POST' })).rejects.toMatchObject({
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
