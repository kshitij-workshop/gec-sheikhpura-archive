import { apiRequest } from './client'
import type {
  EventSuggestion,
  PageResponse,
  PhotoReport,
  RegisteredPhoto,
  RemovalRequest,
  ReportCategory,
  Submission,
  UploadAuthorization,
  UserPhoto,
} from './types'

export interface CreateSubmissionInput {
  eventId: string
  albumId: string
  note?: string | null
}

export interface RegisterPhotoInput {
  authorizationId: string
  publicId: string
  title?: string | null
  caption?: string | null
  altText?: string | null
  takenAt?: string | null
  photographers: Array<{
    contributorProfileId?: string | null
    creditName: string
  }>
}

export interface CreateSuggestionInput {
  title: string
  description?: string | null
  approximateDate?: string | null
  categoryId?: string | null
  academicYearId?: string | null
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

export function createSubmission(
  input: CreateSubmissionInput,
): Promise<Submission> {
  return apiRequest<Submission>('/me/submissions', {
    method: 'POST',
    body: input,
  })
}

export function listSubmissions(
  page = 0,
  size = 12,
): Promise<PageResponse<Submission>> {
  return apiRequest<PageResponse<Submission>>(
    `/me/submissions${toQuery({ page, size })}`,
  )
}

export function authorizeUpload(
  submissionId: string,
): Promise<UploadAuthorization> {
  return apiRequest<UploadAuthorization>('/me/uploads/authorize', {
    method: 'POST',
    body: { submissionId },
  })
}

export function registerPhoto(
  submissionId: string,
  input: RegisterPhotoInput,
): Promise<RegisteredPhoto> {
  return apiRequest<RegisteredPhoto>(
    `/me/submissions/${encodeURIComponent(submissionId)}/photos`,
    { method: 'POST', body: input },
  )
}

export function listMyPhotos(
  page = 0,
  size = 12,
): Promise<PageResponse<UserPhoto>> {
  return apiRequest<PageResponse<UserPhoto>>(
    `/me/photos${toQuery({ page, size })}`,
  )
}

export function requestRemoval(
  photoId: string,
  reason: string,
): Promise<RemovalRequest> {
  return apiRequest<RemovalRequest>(
    `/me/photos/${encodeURIComponent(photoId)}/removal-request`,
    { method: 'POST', body: { reason } },
  )
}

export interface ReportPhotoInput {
  category: ReportCategory
  details?: string | null
}

/**
 * Reports a published photograph. Requires a signed-in account; the server
 * refuses reports against photographs that are not publicly visible and
 * rejects a second open report from the same account.
 */
export function reportPhoto(
  photoId: string,
  input: ReportPhotoInput,
): Promise<PhotoReport> {
  return apiRequest<PhotoReport>(
    `/photos/${encodeURIComponent(photoId)}/reports`,
    { method: 'POST', body: input },
  )
}

export function createSuggestion(
  input: CreateSuggestionInput,
): Promise<EventSuggestion> {
  return apiRequest<EventSuggestion>('/me/event-suggestions', {
    method: 'POST',
    body: input,
  })
}

export function listMySuggestions(
  page = 0,
  size = 12,
): Promise<PageResponse<EventSuggestion>> {
  return apiRequest<PageResponse<EventSuggestion>>(
    `/me/event-suggestions${toQuery({ page, size })}`,
  )
}
