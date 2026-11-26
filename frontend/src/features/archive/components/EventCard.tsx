import { Link } from 'react-router'

import type { ArchiveEvent, PublicPhoto } from '../../../lib/api/types'
import { formatEventDate } from '../../../lib/format'
import { EventCover } from './ArchiveCover'

export interface EventCardProps {
  event: ArchiveEvent
  /** A real approved photograph for the event, when one is available. */
  cover?: PublicPhoto
  /** Larger treatment for the leading item in an editorial listing. */
  emphasis?: boolean
}

/** Photo-first event card used on the home page and archive listing. */
export function EventCard({ event, cover, emphasis = false }: EventCardProps) {
  const albumCount = event.albums.length

  return (
    <article className="group flex h-full flex-col border border-archive-line bg-archive-surface/30 transition-colors duration-300 hover:border-archive-accent/60">
      <Link
        to={`/events/${event.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block overflow-hidden bg-archive-surface"
      >
        <EventCover
          event={event}
          photo={cover}
          width={emphasis ? 1200 : 800}
          height={emphasis ? 750 : 600}
          className={[
            'w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]',
            emphasis ? 'aspect-[16/10]' : 'aspect-[4/3]',
          ].join(' ')}
        />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-archive-muted">
          <span>{formatEventDate(event.eventDate)}</span>
          <span>{event.academicYear.label}</span>
        </div>

        <h3
          className={[
            'mt-3 font-serif font-normal leading-[1.08] tracking-[-0.02em] text-archive-ink',
            emphasis ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
          ].join(' ')}
        >
          <Link
            to={`/events/${event.slug}`}
            className="transition-colors hover:text-archive-accent"
          >
            {event.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-archive-muted">
            {albumCount === 0
              ? 'No albums'
              : `${String(albumCount)} ${albumCount === 1 ? 'album' : 'albums'}`}
          </span>
          <Link
            to={`/contribute?event=${event.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-archive-accent transition-colors hover:text-archive-ink"
          >
            <span aria-hidden="true">+</span> Add photos
          </Link>
        </div>
      </div>
    </article>
  )
}
