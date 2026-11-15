import { Link, useParams } from 'react-router'

import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { formatEventDate } from '../../lib/format'
import { Breadcrumbs } from './components/Breadcrumbs'
import { useEvent } from './queries'

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const event = useEvent(slug)

  if (event.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    )
  }

  if (event.isError) {
    const notFound = event.error instanceof ApiError && event.error.status === 404

    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Archive', to: '/archive' }, { label: 'Event' }]} />
        {notFound ? (
          <EmptyState
            title="This event is not in the public archive"
            description="It may be unpublished, removed, or the link may be incorrect. Only published events are visible."
            action={
              <Link to="/archive" className={buttonStyles({ variant: 'primary' })}>
                Browse the archive
              </Link>
            }
          />
        ) : (
          <Alert tone="danger" title="The event could not be loaded">
            {event.error instanceof Error
              ? event.error.message
              : 'Please try again in a moment.'}
          </Alert>
        )}
      </div>
    )
  }

  const data = event.data

  return (
    <article className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Archive', to: '/archive' },
          { label: data.academicYear.label, to: `/archive?year=${data.academicYear.id}` },
          { label: data.title },
        ]}
      />

      <PageHeader
        eyebrow={data.category.name}
        title={data.title}
        description={data.description ?? undefined}
        actions={
          data.featured ? <Badge tone="info">Featured event</Badge> : undefined
        }
      />

      <dl className="grid gap-4 rounded-xl border border-archive-line bg-archive-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.15em] text-archive-muted">
            Date
          </dt>
          <dd className="text-sm font-medium">{formatEventDate(data.eventDate)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.15em] text-archive-muted">
            Academic year
          </dt>
          <dd className="text-sm font-medium">{data.academicYear.label}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.15em] text-archive-muted">
            Category
          </dt>
          <dd className="text-sm font-medium">{data.category.name}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs uppercase tracking-[0.15em] text-archive-muted">
            Location
          </dt>
          <dd className="text-sm font-medium">{data.location ?? 'Not recorded'}</dd>
        </div>
      </dl>

      <section aria-labelledby="event-albums-heading" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="event-albums-heading"
            className="font-serif text-2xl font-semibold tracking-tight"
          >
            Albums
          </h2>
          <p className="text-sm text-archive-muted">
            Approved photographs are grouped into published albums.
          </p>
        </div>

        {data.albums.length === 0 ? (
          <EmptyState
            title="No published albums yet"
            description="Photographs from this event will appear once an album is published and its photographs are approved."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.albums.map((album) => (
              <li key={album.id}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <Link
                    to={`/albums/${album.slug}`}
                    className="flex h-full flex-col gap-2 p-5"
                  >
                    <h3 className="font-serif text-xl font-semibold leading-snug tracking-tight">
                      {album.title}
                    </h3>
                    {album.description ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-archive-muted">
                        {album.description}
                      </p>
                    ) : null}
                    <span className="mt-auto pt-2 text-xs font-medium uppercase tracking-[0.15em] text-archive-accent">
                      View album →
                    </span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}
