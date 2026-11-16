const VISITOR_KEY = 'gecs.visitor-id'
const LAST_VISIT_KEY = 'gecs.last-visit-day'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Returns the anonymous visitor identifier, creating one if needed.
 *
 * The value is a random UUID. It is never derived from the IP address, the
 * user agent, or an account, and it is only ever sent to record a visit.
 */
export function ensureVisitorId(): string | null {
  const store = storage()
  if (!store) return null
  try {
    const existing = store.getItem(VISITOR_KEY)
    if (existing !== null) return existing
    const created = crypto.randomUUID()
    store.setItem(VISITOR_KEY, created)
    return created
  } catch {
    return null
  }
}

/** UTC day key used both for the once-per-day guard and the backend record. */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function hasVisitBeenRecorded(day: string): boolean {
  const store = storage()
  if (!store) return true
  try {
    return store.getItem(LAST_VISIT_KEY) === day
  } catch {
    return true
  }
}

export function markVisitRecorded(day: string): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(LAST_VISIT_KEY, day)
  } catch {
    // Counting is best-effort; a full or blocked storage is not an error.
  }
}
