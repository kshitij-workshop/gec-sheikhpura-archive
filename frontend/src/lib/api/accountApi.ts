import { apiRequest } from './client'
import type { MessageResponse, User } from './types'

export interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export interface ResetPasswordInput {
  token: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

/**
 * Account lifecycle calls. Registration, verification, and reset are
 * unauthenticated; the responses are deliberately generic so the UI cannot be
 * used to discover which email addresses have accounts.
 */
export function registerAccount(input: RegisterInput): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  })
}

export function verifyEmail(token: string): Promise<void> {
  return apiRequest<void>('/auth/verify-email', {
    method: 'POST',
    body: { token },
    auth: false,
  })
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

export function requestPasswordReset(email: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return apiRequest<void>('/auth/reset-password', {
    method: 'POST',
    body: input,
    auth: false,
  })
}

export function updateProfile(displayName: string): Promise<User> {
  return apiRequest<User>('/me', {
    method: 'PATCH',
    body: { displayName },
  })
}

export function changePassword(input: ChangePasswordInput): Promise<void> {
  return apiRequest<void>('/me/password', {
    method: 'PATCH',
    body: input,
  })
}
