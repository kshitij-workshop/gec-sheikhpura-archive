import { ApiError } from './client'

/**
 * Shared react-query retry policy: deterministic client errors such as a
 * missing public record are never retried, and everything else retries once.
 */
export function retryUnlessNotFound(
  failureCount: number,
  error: Error,
): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }

  return failureCount < 1
}
