import { Link, useParams } from 'react-router'

import {
  Alert,
  EmptyState,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { formatEventDate } from '../../lib/format'
import { AlbumCard } from './components/AlbumCard'
import { Breadcrumbs } from './components/Breadcrumbs'
import { EventCover } from './components/ArchiveCover'
import { useEvent, usePhotoIndex } from './queries'

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>()
  const event = useEvent(slug)
  const covers = usePhotoIndex()

  if (event.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="aspect-[21/9] w-full" />
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (event.isError) {
    const notFound = event.error instanceof ApiError && event.error.status === 404

    return (
      <div className="space-y-8">
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
  const cover = covers.eventCovers.get(data.id)

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Archive', to: '/archive' },
          { label: data.academicYear.label, to: `/archive?year=${data.academicYear.id}` },
          { label: data.title },
        ]}
      />

      <header>
        <div className="overflow-hidden border border-archive-line bg-archive-surface">
          <EventCover
            event={data}
            photo={cover}
            width={1600}
            height={900}
            eager
            className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]"
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow text-archive-accent">{data.category.name}</p>
              {data.featured ? (
                <span className="text-[10px] uppercase tracking-[0.16em] text-archive-muted">
                  Featured
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 max-w-5xl font-serif text-[clamp(2.5rem,5.5vw,4.75rem)] font-normal leading-[0.95] tracking-[-0.035em] text-archive-ink">
              {data.title}
            </h1>
            {data.description ? (
              <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-archive-muted">
                {data.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4 lg:items-end">
            <Link
              to={`/contribute?event=${data.id}`}
              className={buttonStyles({ variant: 'primary' })}
            >
              Add photos
            </Link>
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-archive-muted lg:justify-end">
              <span>{formatEventDate(data.eventDate)}</span>
              <span aria-hidden="true">·</span>
              <span>{data.location ?? 'Location not recorded'}</span>
              <span aria-hidden="true">·</span>
              <span>{data.academicYear.label}</span>
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="event-albums-heading" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-archive-line pt-6">
          <h2
            id="event-albums-heading"
            className="font-serif text-2xl font-normal tracking-tight text-archive-ink sm:text-3xl"
          >
            Albums
          </h2>
          <p className="text-[11px] uppercase tracking-[0.18em] text-archive-muted">
            {data.albums.length === 1
              ? '1 album'
              : `${String(data.albums.length)} albums`}
          </p>
        </div>

        {data.albums.length === 0 ? (
          <EmptyState
            title="No albums yet"
            description="Photos will appear here once an album is published."
            action={
              <Link
                to={`/contribute?event=${data.id}`}
                className={buttonStyles({ variant: 'secondary' })}
              >
                Add photos
              </Link>
            }
          />
        ) : (
          <ul
            className={[
              'grid gap-5',
              data.albums.length > 1 ? 'sm:grid-cols-2' : '',
              data.albums.length > 2 ? 'lg:grid-cols-3' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {data.albums.map((album) => (
              <li key={album.id}>
                <AlbumCard
                  album={album}
                  event={data}
                  cover={covers.albumCovers.get(album.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}
