import { apiRequest } from '../../lib/api/client'
import type {
  GoogleSignInInput,
  LoginInput,
  TokenResponse,
  User,
} from '../../lib/api/types'

/** Credentialed login; the refresh cookie is set by the response. */
export function loginRequest(input: LoginInput): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  })
}

/**
 * Exchanges a Google ID token for an archive session. The backend verifies the
 * token with Google's keys; the browser never sends anything else.
 */
export function googleSignInRequest(
  input: GoogleSignInInput,
): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/google', {
    method: 'POST',
    body: input,
    auth: false,
  })
}

export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>('/me')
}
