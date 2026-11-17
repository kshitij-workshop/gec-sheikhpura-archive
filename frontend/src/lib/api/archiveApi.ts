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
  return publicRequest(
    `albums/slug/${encodeURIComponent(slug)}${toSearchParams({ page, size })}`,
  )
}

export function fetchAcademicYears(): Promise<AcademicYear[]> {
  return publicRequest('academic-years')
}

export function fetchRecentPhotos(
  page = 0,
  size = 12,
): Promise<PageResponse<RecentPhoto>> {
  return publicRequest(`photos${toSearchParams({ page, size })}`)
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
