import { apiRequest } from '../../lib/api/client'
import type { LoginInput, TokenResponse, User } from '../../lib/api/types'

/** Credentialed login; the refresh cookie is set by the response. */
export function loginRequest(input: LoginInput): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  })
}

export function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>('/me')
}
