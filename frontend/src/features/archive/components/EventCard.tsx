import { Link } from 'react-router'

import { Badge, Card } from '../../../components/ui'
import type { ArchiveEvent } from '../../../lib/api/types'
import { formatEventDate } from '../../../lib/format'

export interface EventCardProps {
  event: ArchiveEvent
}

/** Editorial summary card used on the home page and archive listing. */
export function EventCard({ event }: EventCardProps) {
  const albumCount = event.albums.length

  return (
    <Card className="group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{event.academicYear.label}</Badge>
        {event.featured ? <Badge tone="info">Featured</Badge> : null}
      </div>

      <p className="text-xs uppercase tracking-[0.18em] text-archive-muted">
        {formatEventDate(event.eventDate)}
        {event.location ? ` · ${event.location}` : ''}
      </p>

      <h2 className="font-serif text-xl font-semibold leading-snug tracking-tight">
        <Link
          to={`/events/${event.slug}`}
          className="text-archive-ink decoration-archive-accent/40 underline-offset-4 hover:text-archive-accent hover:underline"
        >
          {event.title}
        </Link>
      </h2>

      {event.description ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-archive-muted">
          {event.description}
        </p>
      ) : null}

      <p className="mt-auto pt-2 text-xs text-archive-muted">
        {event.category.name}
        {' · '}
        {albumCount === 0
          ? 'No albums yet'
          : `${String(albumCount)} ${albumCount === 1 ? 'album' : 'albums'}`}
      </p>
    </Card>
  )
}
