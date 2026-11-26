import { apiRequest } from './client'
import type {
  AlbumDetail,
  ArchiveEvent,
  AcademicYear,
  Category,
  PageResponse,
  PublicContributor,
  RecentPhoto,
} from './types'

export interface EventQuery {
  page?: number
  size?: number
  query?: string
  academicYearId?: string
  categoryId?: string
  featured?: boolean
}

type QueryValue = string | number | boolean | undefined | null

function toSearchParams(values: Record<string, QueryValue>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue
    }
    const text = String(value).trim()
    if (text.length === 0) {
      continue
    }
    params.set(key, text)
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

/**
 * Public archive reads. They are deliberately unauthenticated: browsing must
 * work for guests, and sending a stale bearer token would trigger pointless
 * refresh attempts.
 */
function publicRequest<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { auth: false })
}

/**
 * Public reads that adapt to the caller. Guests and signed-in visitors see the
 * same archive, but the server marks a photograph the viewer uploaded so the
 * page can offer a removal request. `authRequest` still works for guests
 * because `apiRequest` only attaches a token when one is held in memory.
 */
function viewerAwareRequest<T>(path: string): Promise<T> {
  return apiRequest<T>(path)
}

export function fetchEvents(
  query: EventQuery = {},
): Promise<PageResponse<ArchiveEvent>> {
  return publicRequest(
    `events${toSearchParams({
      page: query.page,
      size: query.size,
      query: query.query,
      academicYearId: query.academicYearId,
      categoryId: query.categoryId,
      featured: query.featured,
    })}`,
  )
}

export function fetchEventBySlug(slug: string): Promise<ArchiveEvent> {
  return publicRequest(`events/slug/${encodeURIComponent(slug)}`)
}

export function fetchAlbumBySlug(
  slug: string,
  page = 0,
  size = 24,
): Promise<AlbumDetail> {
  return viewerAwareRequest(
    `albums/slug/${encodeURIComponent(slug)}${toSearchParams({ page, size })}`,
  )
}

/**
 * First approved photograph of an album, used as a cover. It reuses the public
 * album endpoint with a one-item page instead of introducing a new contract.
 */
export function fetchAlbumPreview(slug: string): Promise<AlbumDetail> {
  return fetchAlbumBySlug(slug, 0, 1)
}

export function fetchAcademicYears(): Promise<AcademicYear[]> {
  return publicRequest('academic-years')
}

export function fetchRecentPhotos(
  page = 0,
  size = 12,
): Promise<PageResponse<RecentPhoto>> {
  return viewerAwareRequest(`photos${toSearchParams({ page, size })}`)
}

export function fetchCategories(): Promise<Category[]> {
  return publicRequest('categories')
}

export function fetchContributors(
  page = 0,
  size = 24,
): Promise<PageResponse<PublicContributor>> {
  return publicRequest(`contributors${toSearchParams({ page, size })}`)
}
