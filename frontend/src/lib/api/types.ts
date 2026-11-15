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

export interface AcademicYear {
  id: string
  label: string
  startDate: string
  endDate: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  active: boolean
}

export interface AlbumSummary {
  id: string
  title: string
  slug: string
  description: string | null
  sortOrder: number
}

/**
 * Public event shape. Named `ArchiveEvent` so it never collides with the DOM
 * `Event` type in shared code.
 */
export interface ArchiveEvent {
  id: string
  title: string
  slug: string
  description: string | null
  eventDate: string
  location: string | null
  published: boolean
  featured: boolean
  academicYear: AcademicYear
  category: Category
  albums: AlbumSummary[]
}

export interface PublicPhotographerCredit {
  creditName: string
  creditOrder: number
}

/** Public photo metadata. Delivery URLs are built client-side. */
export interface PublicPhoto {
  id: string
  title: string | null
  caption: string | null
  altText: string | null
  cloudinaryPublicId: string
  format: string
  widthPx: number
  heightPx: number
  takenAt: string | null
  sortOrder: number
  photographers: PublicPhotographerCredit[]
}

export interface AlbumDetail {
  id: string
  title: string
  slug: string
  description: string | null
  event: ArchiveEvent
  photos: PageResponse<PublicPhoto>
}

export interface PublicContributor {
  id: string
  displayName: string
  slug: string
  bio: string | null
}
