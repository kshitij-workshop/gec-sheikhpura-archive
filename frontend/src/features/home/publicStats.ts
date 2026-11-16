import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  getPublicStats,
  recordPublicVisit,
} from '../../lib/api/publicStatsApi'
import {
  ensureVisitorId,
  hasVisitBeenRecorded,
  markVisitRecorded,
  utcDayKey,
} from '../../lib/visitor'

const statsKey = ['public-stats'] as const

export function usePublicStats() {
  return useQuery({
    queryKey: statsKey,
    queryFn: getPublicStats,
    staleTime: 60_000,
    retry: false,
  })
}

/**
 * Records at most one visit per browser per UTC day. Failures are ignored:
 * counting must never affect what a visitor can use.
 */
export function useRecordVisit(): void {
  useEffect(() => {
    const day = utcDayKey()
    if (hasVisitBeenRecorded(day)) return
    const visitorId = ensureVisitorId()
    if (visitorId === null) return
    void recordPublicVisit(visitorId)
      .then(() => {
        markVisitRecorded(day)
      })
      .catch(() => undefined)
  }, [])
}
