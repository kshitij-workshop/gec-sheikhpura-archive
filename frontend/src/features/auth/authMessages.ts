import { ApiError } from '../../lib/api/client'

/** Maps password sign-in failures to safe, non-enumerating guidance. */
export function signInMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Email or password is incorrect.'
    }
    if (error.status === 429) {
      return 'Too many sign-in attempts. Wait a moment and try again.'
    }
    if (error.status === 403) {
      return 'Sign-in was blocked by the server. Try again from the archive’s official address.'
    }
    return error.problem?.detail ?? 'Sign-in failed. Please try again.'
  }

  return 'The server could not be reached. Check your connection and try again.'
}

/**
 * Google sign-in adds two outcomes password login cannot produce: an address
 * already connected to a different Google account (`409`) and a deployment
 * without a Google client ID (`503`).
 */
export function googleSignInMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Google could not confirm this account. Try again, or sign in with your email and password.'
    }
    if (error.status === 409) {
      return (
        error.problem?.detail ??
        'This email address is already connected to a different Google account.'
      )
    }
    if (error.status === 429) {
      return 'Too many sign-in attempts. Wait a moment and try again.'
    }
    if (error.status === 503) {
      return 'Google sign-in is not available on this archive yet. Use your email and password instead.'
    }
    return error.problem?.detail ?? 'Google sign-in failed. Please try again.'
  }

  return 'The server could not be reached. Check your connection and try again.'
}
