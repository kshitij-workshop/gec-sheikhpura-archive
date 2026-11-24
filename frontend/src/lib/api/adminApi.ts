import { apiRequest } from './client'
import type {
  AcademicYear,
  AdminAlbum,
  ArchiveEvent,
  Category,
  ModerationAction,
  ModerationHistoryEntry,
  ModerationPhoto,
  PageResponse,
  PhotoStatus,
} from './types'

export interface ModerationQueueQuery {
  status?: PhotoStatus | null
  page?: number
  size?: number
}

export interface ModerationInput {
  /** Required by the server for every action except approval. */
  reason?: string | null
  /**
   * Consumed by approval. Assigns or moves the photograph; when omitted the
   * photograph keeps its current album.
   */
  albumId?: string | null
  /**
   * Optional consistency check for approval. It must match the selected
   * album's event, and it is required when the album belongs to a different
   * event than the photograph's current one.
   */
  eventId?: string | null
  /** Approval-only display detail edits. Omitted values are left untouched. */
  title?: string | null
  caption?: string | null
  altText?: string | null
}

/** Administrator edit of a photograph's filing and display details. */
export interface UpdatePhotoInput {
  albumId: string
  /** Must match the selected album's event when supplied. */
  eventId?: string | null
  title?: string | null
  caption?: string | null
  altText?: string | null
}

function toQuery(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && String(value).length > 0) {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

/**
 * Administrative moderation reads and transitions. Every call is authorized
 * again by the API; the role guard in the router is usability only.
 */
export function listModerationQueue({
  status = null,
  page = 0,
  size = 12,
}: ModerationQueueQuery = {}): Promise<PageResponse<ModerationPhoto>> {
  return apiRequest<PageResponse<ModerationPhoto>>(
    `/admin/moderation/photos${toQuery({
      status: status ?? undefined,
      page,
      size,
    })}`,
  )
}

export function getModerationHistory(
  photoId: string,
): Promise<ModerationHistoryEntry[]> {
  return apiRequest<ModerationHistoryEntry[]>(
    `/admin/photos/${encodeURIComponent(photoId)}/moderation-history`,
  )
}

/** One photograph as moderators see it, for public-page admin controls. */
export function getAdminPhoto(photoId: string): Promise<ModerationPhoto> {
  return apiRequest<ModerationPhoto>(
    `/admin/photos/${encodeURIComponent(photoId)}`,
  )
}

export function moderatePhoto(
  photoId: string,
  action: ModerationAction,
  input: ModerationInput = {},
): Promise<ModerationPhoto> {
  return apiRequest<ModerationPhoto>(
    `/admin/photos/${encodeURIComponent(photoId)}/${action}`,
    { method: 'POST', body: input },
  )
}

/** Albums for one event, including unpublished ones. */
export function listAdminAlbums(eventId: string): Promise<AdminAlbum[]> {
  return apiRequest<AdminAlbum[]>(
    `/admin/albums${toQuery({ eventId })}`,
  )
}

/**
 * Re-files or retitles a photograph without changing its moderation status.
 * The album decides the photograph's event; `eventId` is a consistency check.
 */
export function updatePhoto(
  photoId: string,
  input: UpdatePhotoInput,
): Promise<ModerationPhoto> {
  return apiRequest<ModerationPhoto>(
    `/admin/photos/${encodeURIComponent(photoId)}`,
    { method: 'PATCH', body: input },
  )
}

export function listAdminYears(): Promise<AcademicYear[]> {
  return apiRequest<AcademicYear[]>('/admin/academic-years')
}
export function listAdminCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/admin/categories')
}
export function listAdminEvents(page = 0, size = 10) {
  return apiRequest<PageResponse<ArchiveEvent>>(`/admin/events?page=${page}&size=${size}`)
}
export function createAdminYear(input: unknown) { return apiRequest<AcademicYear>('/admin/academic-years', { method: 'POST', body: input }) }
export function updateAdminYear(id: string, input: unknown) { return apiRequest<AcademicYear>(`/admin/academic-years/${id}`, { method: 'PATCH', body: input }) }
export function deleteAdminYear(id: string) { return apiRequest<void>(`/admin/academic-years/${id}`, { method: 'DELETE' }) }
export function createAdminCategory(input: unknown) { return apiRequest<Category>('/admin/categories', { method: 'POST', body: input }) }
export function updateAdminCategory(id: string, input: unknown) { return apiRequest<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: input }) }
export function deactivateAdminCategory(id: string) { return apiRequest<Category>(`/admin/categories/${id}`, { method: 'DELETE' }) }
export function createAdminEvent(input: unknown) { return apiRequest<ArchiveEvent>('/admin/events', { method: 'POST', body: input }) }
export function updateAdminEvent(id: string, input: unknown) { return apiRequest<ArchiveEvent>(`/admin/events/${id}`, { method: 'PATCH', body: input }) }
export function archiveAdminEvent(id: string) { return apiRequest<ArchiveEvent>(`/admin/events/${id}`, { method: 'DELETE' }) }
export function createAdminAlbum(input: unknown) { return apiRequest<AdminAlbum>('/admin/albums', { method: 'POST', body: input }) }
export function updateAdminAlbum(id: string, input: unknown) { return apiRequest<AdminAlbum>(`/admin/albums/${id}`, { method: 'PATCH', body: input }) }
export function archiveAdminAlbum(id: string) { return apiRequest<AdminAlbum>(`/admin/albums/${id}`, { method: 'DELETE' }) }
