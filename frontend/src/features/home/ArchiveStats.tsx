import { usePublicStats } from './publicStats'

const numberFormat = new Intl.NumberFormat('en-IN')

/**
 * Compact, single-line archive activity summary for the footer. It stays
 * silent while loading or when the counter endpoint is unavailable, so no
 * page ever depends on statistics.
 */
export function ArchiveStats() {
  const stats = usePublicStats()

  if (!stats.data) return null

  return (
    <p
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-archive-muted"
      aria-label="Archive activity"
    >
      <span>
        <span className="font-medium text-archive-ink">
          {numberFormat.format(stats.data.totalVisitors)}
        </span>{' '}
        visitors
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <span className="font-medium text-archive-ink">
          {numberFormat.format(stats.data.visitorsToday)}
        </span>{' '}
        today
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <span className="font-medium text-archive-ink">
          {numberFormat.format(stats.data.registeredUsers)}
        </span>{' '}
        members
      </span>
      <span aria-hidden="true">·</span>
      <span title="Accounts active in the last 30 minutes">
        <span className="font-medium text-archive-ink">
          {numberFormat.format(stats.data.activeUsers)}
        </span>{' '}
        signed in
      </span>
    </p>
  )
}
