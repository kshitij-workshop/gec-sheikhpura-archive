import { Link } from 'react-router'

import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { EventCard } from '../archive/components/EventCard'
import { useAcademicYears, useEvents } from '../archive/queries'
import { ArchiveStats } from './ArchiveStats'
import { useRecordVisit } from './publicStats'

const values = [
  {
    title: 'Reviewed before publication',
    description:
      'Every community submission enters moderation. Pending and rejected photographs are never reachable from the public archive.',
  },
  {
    title: 'Attribution, always',
    description:
      'Uploading and photographing are separate roles. Photographer credits are recorded explicitly and shown with each published photograph.',
  },
  {
    title: 'Privacy respected',
    description:
      'No facial recognition and no automatic identification. Visitors can report a photograph, and removal requests are reviewed by administrators.',
  },
] as const

function EventGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-archive-line bg-archive-surface p-5"
        >
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const featured = useEvents({ featured: true, size: 3 })
  const latest = useEvents({ size: 6 })
  const years = useAcademicYears()
  useRecordVisit()

  const archiveUnavailable = featured.isError || latest.isError

  return (
    <div className="space-y-14">
      <PageHeader
        eyebrow="The GEC Sheikhpura archive"
        title="A photographic memory of the college, kept by its community."
        description="Events, people, and places from Government Engineering College, Sheikhpura — collected, credited, and published with care for future generations."
        actions={
          <>
            <Link to="/archive" className={buttonStyles({ variant: 'primary' })}>
              Explore the archive
            </Link>
            <Link
              to="/contribute"
              className={buttonStyles({ variant: 'secondary' })}
            >
              Share photographs
            </Link>
          </>
        }
      />

      {archiveUnavailable ? (
        <Alert tone="warning" title="The archive is temporarily unavailable">
          Published events could not be loaded right now. You can still browse
          the archive page or try again in a moment.
        </Alert>
      ) : null}

      <ArchiveStats />

      <section aria-labelledby="featured-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="featured-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Featured events
          </h2>
          <Link
            to="/archive?featured=true"
            className="text-sm font-medium text-archive-accent underline-offset-4 hover:underline"
          >
            All featured events
          </Link>
        </div>

        {featured.isPending ? <EventGridSkeleton /> : null}

        {featured.data && featured.data.items.length === 0 ? (
          <EmptyState
            title="Featured events are being prepared"
            description="Browse the full archive to see everything published so far."
            action={
              <Link to="/archive" className={buttonStyles({ variant: 'secondary' })}>
                Open the archive
              </Link>
            }
          />
        ) : null}

        {featured.data && featured.data.items.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.items.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="latest-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="latest-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Recently added
          </h2>
          <Link
            to="/archive"
            className="text-sm font-medium text-archive-accent underline-offset-4 hover:underline"
          >
            View every event
          </Link>
        </div>

        {latest.isPending ? <EventGridSkeleton /> : null}

        {latest.data && latest.data.items.length === 0 ? (
          <EmptyState
            title="The public archive is just getting started"
            description="Published events will appear here as administrators complete the first collection."
          />
        ) : null}

        {latest.data && latest.data.items.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.data.items.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {years.data && years.data.length > 0 ? (
        <section aria-labelledby="years-heading" className="space-y-3">
          <h2
            id="years-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Browse by academic year
          </h2>
          <ul className="flex flex-wrap gap-2">
            {years.data.map((year) => (
              <li key={year.id}>
                <Link
                  to={`/archive?year=${year.id}`}
                  className="inline-flex items-center rounded-full border border-archive-line bg-archive-surface px-4 py-1.5 text-sm font-medium text-archive-ink transition-colors hover:border-archive-accent hover:text-archive-accent"
                >
                  {year.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="values-heading" className="space-y-4">
        <div className="space-y-1">
          <Badge tone="accent">How the archive works</Badge>
          <h2
            id="values-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Built on care, credit, and consent
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {values.map((value) => (
            <li key={value.title}>
              <Card className="h-full space-y-2 p-5">
                <h3 className="font-medium text-archive-ink">{value.title}</h3>
                <p className="text-sm leading-relaxed text-archive-muted">
                  {value.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
