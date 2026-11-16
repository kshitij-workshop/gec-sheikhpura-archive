import { apiRequest } from './client'
import type { PublicStats } from './types'

export function getPublicStats() {
  return apiRequest<PublicStats>('/public-stats', { auth: false })
}

/**
 * Reports one anonymous visit for the current UTC day. The endpoint is
 * idempotent per visitor identifier, so a retry is harmless.
 */
export function recordPublicVisit(visitorId: string) {
  return apiRequest<void>('/public-stats/visits', {
    method: 'POST',
    body: { visitorId },
    auth: false,
    retryOnUnauthorized: false,
  })
}
