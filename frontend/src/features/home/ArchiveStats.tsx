import { Card, Skeleton } from '../../components/ui'
import { usePublicStats } from './publicStats'

interface StatProps {
  label: string
  value: number
  hint: string
}

function Stat({ label, value, hint }: StatProps) {
  return (
    <Card className="space-y-1 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-archive-muted">
        {label}
      </p>
      <p className="font-serif text-3xl font-semibold tracking-tight">
        {value.toLocaleString('en-IN')}
      </p>
      <p className="text-xs text-archive-muted">{hint}</p>
    </Card>
  )
}

/**
 * Aggregate archive activity. It is deliberately invisible when the endpoint
 * is unavailable: the homepage must not depend on statistics.
 */
export function ArchiveStats() {
  const stats = usePublicStats()

  if (stats.isPending) {
    return (
      <section aria-label="Archive activity" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-2 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </section>
    )
  }

  if (stats.isError || !stats.data) return null

  return (
    <section
      aria-label="Archive activity"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Stat
        label="Archive visitors"
        value={stats.data.totalVisitors}
        hint="Anonymous browsers recorded so far"
      />
      <Stat
        label="Visitors today"
        value={stats.data.visitorsToday}
        hint="Counted once per browser per day"
      />
      <Stat
        label="Registered members"
        value={stats.data.registeredUsers}
        hint="Verified community accounts"
      />
      <Stat
        label="Signed in now"
        value={stats.data.activeUsers}
        hint="Active in the last 30 minutes"
      />
    </section>
  )
}
