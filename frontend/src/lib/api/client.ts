import type { CsrfResponse, TokenResponse } from './types'

export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  errors?: Array<{ field: string; message: string }>
  [key: string]: unknown
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail | undefined

  constructor(status: number, problem?: ProblemDetail) {
    super(
      problem?.detail ??
        problem?.title ??
        `Request failed with status ${String(status)}`,
    )
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

export interface ApiRequestOptions
  extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown
  headers?: Record<string, string>
  /**
   * Attach the in-memory bearer token. Defaults to true for API calls.
   * Public auth calls (login, register) set this to false.
   */
  auth?: boolean
  /** Attach the CSRF header for cookie-authenticated requests. */
  csrf?: boolean
  /** Defaults to true for authenticated requests: refresh once on 401. */
  retryOnUnauthorized?: boolean
}

/**
 * The access token lives in module memory only. It is never written to
 * `localStorage`, `sessionStorage`, or a readable cookie.
 */
let accessToken: string | null = null
let csrfToken: CsrfResponse | null = null
let refreshPromise: Promise<TokenResponse | null> | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** Clears token, CSRF cache, and any in-flight refresh. */
export function clearSession(): void {
  accessToken = null
  csrfToken = null
  refreshPromise = null
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${API_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

async function parseProblem(
  response: Response,
): Promise<ProblemDetail | undefined> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('json')) {
    return undefined
  }

  try {
    return (await response.json()) as ProblemDetail
  } catch {
    return undefined
  }
}

/** Issues (or reuses) the readable CSRF cookie and returns its header pair. */
async function ensureCsrfToken(): Promise<CsrfResponse> {
  if (csrfToken) {
    return csrfToken
  }

  const response = await fetch(buildUrl('/auth/csrf'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new ApiError(response.status, await parseProblem(response))
  }

  csrfToken = (await response.json()) as CsrfResponse
  return csrfToken
}

/**
 * Rotates the refresh cookie into a new access token. Concurrent callers share
 * one request so a page with several failing queries refreshes only once.
 */
export async function refreshAccessToken(): Promise<TokenResponse | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  const pending = (async (): Promise<TokenResponse | null> => {
    try {
      const csrf = await ensureCsrfToken()
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          [csrf.headerName]: csrf.token,
        },
      })

      if (!response.ok) {
        accessToken = null
        return null
      }

      const session = (await response.json()) as TokenResponse
      accessToken = session.accessToken
      return session
    } catch {
      accessToken = null
      return null
    } finally {
      refreshPromise = null
    }
  })()

  refreshPromise = pending
  return pending
}

/** Revokes the refresh-token family and clears local session state. */
export async function logoutSession(): Promise<void> {
  try {
    const csrf = await ensureCsrfToken()
    await fetch(buildUrl('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        [csrf.headerName]: csrf.token,
      },
    })
  } finally {
    clearSession()
  }
}

async function send(
  path: string,
  options: ApiRequestOptions,
): Promise<Response> {
  const {
    body,
    headers,
    auth = true,
    csrf = false,
    ...init
  } = options

  const requestHeaders: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
  }
  if (auth && accessToken !== null) {
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }
  if (csrf) {
    const token = await ensureCsrfToken()
    requestHeaders[token.headerName] = token.token
  }
  Object.assign(requestHeaders, headers)

  return fetch(buildUrl(path), {
    ...init,
    credentials: 'include',
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(response.status, await parseProblem(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()

  if (text.length === 0) {
    return undefined as T
  }

  return JSON.parse(text) as T
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { retryOnUnauthorized, ...requestOptions } = options
  const retry = options.auth !== false && (retryOnUnauthorized ?? true)
  const response = await send(path, requestOptions)

  if (response.status === 401 && retry) {
    const session = await refreshAccessToken()
    if (session) {
      return parseResponse<T>(await send(path, requestOptions))
    }
  }

  return parseResponse<T>(response)
}
