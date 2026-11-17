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

/** The ID token issued by Google Identity Services in the browser. */
export interface GoogleSignInInput {
  idToken: string
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

/** A published photograph with the album and event it belongs to. */
export interface RecentPhoto extends PublicPhoto {
  approvedAt: string
  albumId: string
  albumTitle: string
  albumSlug: string
  eventId: string
  eventTitle: string
  eventSlug: string
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

/* ---- Authenticated contributor views ---- */

export type SubmissionStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'WITHDRAWN'

export type PhotoStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED'
  | 'HIDDEN'
  | 'REMOVED'

export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Submission {
  id: string
  eventId: string
  eventTitle: string
  albumId: string | null
  albumTitle: string | null
  status: SubmissionStatus
  note: string | null
  createdAt: string
  updatedAt: string
}

/** A credit as recorded by the uploader. Never inferred from the uploader. */
export interface PhotographerCredit {
  contributorProfileId: string | null
  creditName: string
  creditOrder: number
}

/** The uploader's own photograph. Deliberately carries no delivery URL. */
export interface UserPhoto {
  id: string
  submissionId: string | null
  eventId: string
  eventTitle: string
  albumId: string | null
  albumTitle: string | null
  title: string | null
  caption: string | null
  altText: string | null
  format: string
  widthPx: number
  heightPx: number
  sizeBytes: number
  takenAt: string | null
  status: PhotoStatus
  createdAt: string
  updatedAt: string
  photographers: PhotographerCredit[]
}

export interface EventSuggestion {
  id: string
  title: string
  description: string | null
  approximateDate: string | null
  categoryId: string | null
  categoryName: string | null
  academicYearId: string | null
  academicYearLabel: string | null
  suggestedByUserId: string
  reviewedByUserId: string | null
  createdEventId: string | null
  status: SuggestionStatus
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface RemovalRequest {
  id: string
  photoId: string
  requestedByUserId: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  resolutionNote: string | null
  handledByUserId: string | null
  handledAt: string | null
  createdAt: string
}

/** Short-lived, single-use Cloudinary upload authorization. */
export interface UploadAuthorization {
  authorizationId: string
  cloudName: string
  apiKey: string
  uploadUrl: string
  uploadPreset: string
  folder: string
  publicId: string
  timestamp: number
  signature: string
  expiresAt: string
  maxFileSizeBytes: number
  allowedFormats: string[]
}

/** Response of registering an uploaded asset; the photo starts PENDING. */
export interface RegisteredPhoto {
  id: string
  submissionId: string | null
  title: string | null
  caption: string | null
  altText: string | null
  format: string
  widthPx: number
  heightPx: number
  sizeBytes: number
  takenAt: string | null
  status: PhotoStatus
  photographers: PhotographerCredit[]
}

export interface MessageResponse {
  message: string
}

/* ---- Administration ---- */

/** Actions the moderation state machine accepts. */
export type ModerationAction =
  | 'approve'
  | 'reject'
  | 'flag'
  | 'hide'
  | 'remove'
  | 'restore'

/**
 * A photograph as moderators see it. Unlike public and uploader read models,
 * this carries the Cloudinary public ID so administrators can review the image;
 * the identifier is only reachable through the role-protected admin API.
 */
export interface ModerationPhoto {
  id: string
  submissionId: string | null
  eventId: string
  eventTitle: string
  albumId: string | null
  albumTitle: string | null
  title: string | null
  caption: string | null
  altText: string | null
  format: string
  cloudinaryPublicId: string
  widthPx: number
  heightPx: number
  sizeBytes: number
  takenAt: string | null
  status: PhotoStatus
  uploadedByUserId: string
  uploaderDisplayName: string
  approvedByUserId: string | null
  approvedAt: string | null
  createdAt: string
  photographers: PhotographerCredit[]
}

/** One append-only moderation transition. */
export interface ModerationHistoryEntry {
  id: string
  action: string
  actorRole: PersistedRole
  actorDisplayName: string
  fromStatus: PhotoStatus | null
  toStatus: PhotoStatus
  reason: string | null
  createdAt: string
}

/** An album as the administrator archive endpoints return it. */
export interface AdminAlbum {
  id: string
  title: string
  slug: string
  description: string | null
  published: boolean
  sortOrder: number
  eventId: string
  eventTitle: string
  eventSlug: string
}

export interface AdminReport {
  id: string
  photoId: string
  reportedByUserId: string
  category: string
  details: string
  status: string
  resolutionNote: string | null
  handledByUserId: string | null
  handledAt: string | null
  createdAt: string
}

export interface AdminRemovalRequest {
  id: string
  photoId: string
  requestedByUserId: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  resolutionNote: string | null
  handledByUserId: string | null
  handledAt: string | null
  createdAt: string
}

export type AdminEventSuggestion = EventSuggestion

export interface AuditLogEntry {
  id: string
  actorUserId: string | null
  actorRole: string | null
  actorDisplayName: string | null
  action: string
  entityType: string
  entityId: string
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AnalyticsSummary {
  photosByStatus: Record<string, number>
  submissionsByStatus: Record<string, number>
  reportsByStatus: Record<string, number>
  removalRequestsByStatus: Record<string, number>
  suggestionsByStatus: Record<string, number>
  usersByStatus: Record<string, number>
  usersByRole: Record<string, number>
  events: number
  publishedEvents: number
  albums: number
  publishedAlbums: number
  academicYears: number
  categories: number
  activeCategories: number
  contributors: number
}

/** Aggregate-only public counters; no identifiers are exposed. */
export interface PublicStats {
  totalVisitors: number
  visitorsToday: number
  registeredUsers: number
  activeUsers: number
  generatedAt: string
}
