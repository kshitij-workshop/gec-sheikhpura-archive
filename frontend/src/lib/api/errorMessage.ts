import { ApiError } from './client'

/**
 * Maps a failed request to guidance a member can act on.
 *
 * Server `ProblemDetail.detail` values are written to be safe for end users, so
 * they are preferred where they exist. Network and server failures fall back to
 * wording that does not imply the submission succeeded.
 */
export function requestFailureMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your session has ended. Sign in again to continue.'
    }
    if (error.status === 403) {
      return (
        error.problem?.detail ??
        'Your account is not allowed to perform this action.'
      )
    }
    if (error.status === 404) {
      return 'That item is no longer available.'
    }
    if (error.status === 409) {
      return (
        error.problem?.detail ??
        'This request conflicts with the current state. Refresh and try again.'
      )
    }
    if (error.status === 429) {
      return 'Too many requests. Wait a little while and try again.'
    }
    if (error.status >= 500) {
      return 'The archive server could not complete this request. Please try again.'
    }

    return error.problem?.detail ?? fallback
  }

  if (error instanceof TypeError) {
    return 'The archive server could not be reached. Check your connection and try again.'
  }

  return fallback
}
