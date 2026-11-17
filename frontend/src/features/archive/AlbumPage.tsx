import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { ApiError } from '../../lib/api/client'
import { formatCredits, formatEventDate } from '../../lib/format'
import { Breadcrumbs } from './components/Breadcrumbs'
import { PhotoImage } from './components/PhotoImage'
import { PhotoActions } from './components/PhotoActions'
import { PhotoViewer } from './components/PhotoViewer'
import { useAlbum } from './queries'

function pageFromParam(value: string | null): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0
}

export default function AlbumPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const page = pageFromParam(searchParams.get('page'))
  const album = useAlbum(slug, page)

  const changePage = (nextPage: number) => {
    setViewerIndex(null)
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 0) {
      next.delete('page')
    } else {
      next.set('page', String(nextPage + 1))
    }
    setSearchParams(next)
    document
      .getElementById('album-photos')
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  if (album.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (album.isError) {
    const notFound = album.error instanceof ApiError && album.error.status === 404

    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Archive', to: '/archive' }, { label: 'Album' }]} />
        {notFound ? (
          <EmptyState
            title="This album is not in the public archive"
            description="It may be unpublished, removed, or the link may be incorrect. Only published albums with approved photographs are visible."
            action={
              <Link to="/archive" className={buttonStyles({ variant: 'primary' })}>
                Browse the archive
              </Link>
            }
          />
        ) : (
          <Alert tone="danger" title="The album could not be loaded">
            {album.error instanceof Error
              ? album.error.message
              : 'Please try again in a moment.'}
          </Alert>
        )}
      </div>
    )
  }

  const data = album.data
  const photos = data.photos.items

  return (
    <article className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Archive', to: '/archive' },
          {
            label: data.event.title,
            to: `/events/${data.event.slug}`,
          },
          { label: data.title },
        ]}
      />

      <PageHeader
        eyebrow={data.event.title}
        title={data.title}
        description={data.description ?? undefined}
        actions={
          <Link
            to={`/events/${data.event.slug}`}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Event details
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-archive-muted">
        <Badge tone="accent">{data.event.academicYear.label}</Badge>
        <span>{formatEventDate(data.event.eventDate)}</span>
        <span aria-hidden="true">·</span>
        <span>{data.event.category.name}</span>
        <span aria-hidden="true">·</span>
        <span aria-live="polite">
          {data.photos.totalElements === 1
            ? '1 approved photograph'
            : `${String(data.photos.totalElements)} approved photographs`}
        </span>
      </div>

      <section
        id="album-photos"
        aria-labelledby="album-photos-heading"
        className="scroll-mt-24 space-y-4"
      >
        <h2 id="album-photos-heading" className="sr-only">
          Approved photographs
        </h2>

        {photos.length === 0 ? (
          <EmptyState
            title="No approved photographs yet"
            description="Photographs appear here after moderation approves them. Pending and rejected submissions are never shown publicly."
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  <figure className="group h-full rounded-lg border border-archive-line bg-white p-2 shadow-[0_1px_2px_rgba(28,25,23,0.06),0_10px_24px_-14px_rgba(28,25,23,0.28)] transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(28,25,23,0.08),0_18px_34px_-16px_rgba(28,25,23,0.38)]">
                    <button
                      type="button"
                      onClick={() => {
                        setViewerIndex(index)
                      }}
                      aria-label={`View ${photo.title?.trim() || `photograph ${String(index + 1)}`}`}
                      className="block w-full overflow-hidden rounded-[3px] bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-archive-accent"
                    >
                      <PhotoImage
                        photo={photo}
                        width={480}
                        height={360}
                        crop="fill"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </button>
                    <figcaption className="mt-2 space-y-0.5 px-1 pb-1">
                      <p className="line-clamp-1 font-serif text-sm font-medium leading-snug text-archive-ink">
                        {photo.title?.trim() || 'Untitled photograph'}
                      </p>
                      <p className="line-clamp-1 text-xs text-archive-muted">
                        {formatCredits(
                          photo.photographers.map(
                            (credit) => credit.creditName,
                          ),
                        )}
                      </p>
                    </figcaption>
                    <PhotoActions
                      photo={photo}
                      compact
                      className="px-1 pb-1 pt-2"
                    />
                  </figure>
                </li>
              ))}
            </ul>

            <Pagination
              page={data.photos.page}
              totalPages={data.photos.totalPages}
              onPageChange={changePage}
              disabled={album.isFetching}
              className="pt-2"
            />
          </>
        )}
      </section>

      <PhotoViewer
        photos={photos}
        index={viewerIndex}
        onClose={() => {
          setViewerIndex(null)
        }}
        onNavigate={setViewerIndex}
      />
    </article>
  )
}
