import { apiRequest } from './client'
import type {
  AdminEventSuggestion,
  AdminRemovalRequest,
  AdminReport,
  AnalyticsSummary,
  AuditLogEntry,
  PageResponse,
  User,
} from './types'

const query = (values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && String(value).length > 0) params.set(key, String(value))
  })
  const result = params.toString()
  return result ? `?${result}` : ''
}

export function listReports(input: {
  status?: string
  category?: string
  eventId?: string
  page?: number
  size?: number
} = {}) {
  return apiRequest<PageResponse<AdminReport>>(
    `/admin/reports${query({
      status: input.status,
      category: input.category,
      eventId: input.eventId,
      page: input.page ?? 0,
      size: input.size ?? 10,
    })}`,
  )
}
export function resolveReport(id: string, input: { status: string; resolutionNote: string }) {
  return apiRequest<AdminReport>(`/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: input })
}
export function listRemovalRequests(input: {
  status?: string
  eventId?: string
  page?: number
  size?: number
} = {}) {
  return apiRequest<PageResponse<AdminRemovalRequest>>(
    `/admin/removal-requests${query({
      status: input.status,
      eventId: input.eventId,
      page: input.page ?? 0,
      size: input.size ?? 10,
    })}`,
  )
}
export function resolveRemovalRequest(id: string, input: { status: string; resolutionNote: string }) {
  return apiRequest<AdminRemovalRequest>(`/admin/removal-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: input })
}
export function listSuggestions(status?: string, page = 0, size = 10) {
  return apiRequest<PageResponse<AdminEventSuggestion>>(`/admin/event-suggestions${query({ status, page, size })}`)
}
export function reviewSuggestion(id: string, input: { status: string; reviewNote: string; createEvent: boolean }) {
  return apiRequest<AdminEventSuggestion>(`/admin/event-suggestions/${encodeURIComponent(id)}`, { method: 'PATCH', body: input })
}
export function listAdminUsers(queryText = '', page = 0, size = 10) {
  return apiRequest<PageResponse<User>>(`/admin/users${query({ query: queryText, page, size })}`)
}
export function changeUserStatus(id: string, status: string) {
  return apiRequest<User>(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })
}
export function changeUserRole(id: string, role: string) {
  return apiRequest<User>(`/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } })
}
export function listAuditLogs(page = 0, size = 20) {
  return apiRequest<PageResponse<AuditLogEntry>>(`/admin/audit-logs${query({ page, size })}`)
}
export function getAnalytics() {
  return apiRequest<AnalyticsSummary>('/admin/analytics')
}
