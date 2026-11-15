/** Roles a persisted account can hold. `GUEST` is never stored on a user. */
export type PersistedRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export type UserStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED'

export interface User {
  id: string
  email: string
  displayName: string
  role: PersistedRole
  status: UserStatus
  emailVerifiedAt: string | null
  createdAt: string
  passwordChangeRequired: boolean
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
}

export interface CsrfResponse {
  token: string
  headerName: string
}

export interface LoginInput {
  email: string
  password: string
}

/** Consistent page envelope returned by every collection endpoint. */
export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
