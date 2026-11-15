import type { PublicPhoto } from './api/types'

const eventDateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timestampFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Formats a `YYYY-MM-DD` archive date without timezone shifts. Event dates are
 * calendar dates, not instants, so parsing them through `Date` would move them
 * across midnight in some zones.
 */
export function formatEventDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return value
  }

  return eventDateFormat.format(new Date(year, month - 1, day))
}

/** Formats an ISO-8601 instant, e.g. when a photograph was taken. */
export function formatTimestamp(value: string): string {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return timestampFormat.format(parsed)
}

/** Joins credited names into one readable line. */
export function formatCredits(names: string[]): string {
  const unique = [...new Set(names.map((name) => name.trim()))].filter(Boolean)

  if (unique.length === 0) {
    return 'Photographer not recorded'
  }
  if (unique.length === 1) {
    return unique[0]!
  }
  if (unique.length === 2) {
    return `${unique[0]!} and ${unique[1]!}`
  }

  return `${unique.slice(0, -1).join(', ')}, and ${unique.at(-1)!}`
}

/** Accessible description for a photograph, with an archival fallback. */
export function photoAltText(photo: PublicPhoto): string {
  return (
    photo.altText?.trim() ||
    photo.title?.trim() ||
    'Photograph from the GEC Sheikhpura archive'
  )
}
