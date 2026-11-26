import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import {
  Alert,
  EmptyState,
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
import { AdminPhotoMenu } from '../admin/AdminPhotoMenu'
import { useAlbum } from './queries'

function pageFromParam(value: string | null): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0
}

const printRatios = [
  { className: 'aspect-[4/3]', width: 720, height: 540 },
  { className: 'aspect-[3/4]', width: 600, height: 800 },
  { className: 'aspect-square', width: 640, height: 640 },
] as const

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
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-16 w-2/3" />
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
      <div className="space-y-8">
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
  const coverPhoto = photos[0]
  const photoCount = data.photos.totalElements

  return (
    <article className="space-y-12">
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

      <header className="space-y-6">
        <div
          aria-hidden="true"
          className="overflow-hidden border border-archive-line bg-archive-surface"
        >
          {coverPhoto ? (
            <PhotoImage
              photo={coverPhoto}
              width={1600}
              height={900}
              crop="fill"
              eager
              className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]"
            />
          ) : (
            <div className="aspect-[16/10] w-full bg-archive-surface sm:aspect-[21/9]" />
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow text-archive-accent">
                {data.event.category.name}
              </p>
              <span aria-hidden="true" className="text-archive-line">
                /
              </span>
              <p className="eyebrow text-archive-muted">
                {data.event.academicYear.label}
              </p>
            </div>
            <h1 className="mt-3 font-serif text-[clamp(2.5rem,5.5vw,4.75rem)] font-normal leading-[0.95] tracking-[-0.035em] text-archive-ink">
              {data.title}
            </h1>
            {data.description ? (
              <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-archive-muted">
                {data.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/contribute?event=${data.event.id}&album=${data.id}`}
                className={buttonStyles({ variant: 'primary' })}
              >
                Add photos
              </Link>
              <Link
                to={`/events/${data.event.slug}`}
                className={buttonStyles({ variant: 'secondary' })}
              >
                Event page
              </Link>
            </div>
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-archive-muted lg:justify-end">
              <span>{formatEventDate(data.event.eventDate)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {photoCount === 1
                  ? '1 approved photograph'
                  : `${String(photoCount)} approved photographs`}
              </span>
            </p>
          </div>
        </div>
      </header>

      <section
        id="album-photos"
        aria-labelledby="album-photos-heading"
        className="scroll-mt-28 space-y-6"
      >
        <h2 id="album-photos-heading" className="sr-only">
          Approved photographs
        </h2>

        {photos.length === 0 ? (
          <EmptyState
            title="No approved photographs yet"
            description="Photos appear here after they are reviewed."
            action={
              <Link
                to={`/contribute?event=${data.event.id}&album=${data.id}`}
                className={buttonStyles({ variant: 'secondary' })}
              >
                Add photos
              </Link>
            }
          />
        ) : (
          <>
            <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {photos.map((photo, index) => {
                const ratio = printRatios[index % printRatios.length]!

                return (
                  <li
                    key={photo.id}
                    className="mb-4 break-inside-avoid"
                  >
                    <figure className="group border border-archive-line bg-archive-surface/50 p-2 transition-colors duration-300 hover:border-archive-accent/50 sm:p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setViewerIndex(index)
                        }}
                        aria-label={`View ${photo.title?.trim() || `photograph ${String(index + 1)}`}`}
                        className="block w-full overflow-hidden bg-archive-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-archive-accent"
                      >
                        <PhotoImage
                          photo={photo}
                          width={ratio.width}
                          height={ratio.height}
                          crop="fill"
                          className={`w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] ${ratio.className}`}
                        />
                      </button>
                      <figcaption className="space-y-1 px-1 pb-1 pt-3">
                        <p className="line-clamp-1 font-serif text-base leading-snug text-archive-ink">
                          {photo.title?.trim() || 'Untitled photograph'}
                        </p>
                        <p className="line-clamp-1 text-[11px] uppercase tracking-[0.14em] text-archive-muted">
                          {formatCredits(
                            photo.photographers.map(
                              (credit) => credit.creditName,
                            ),
                          )}
                        </p>
                      </figcaption>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-archive-line/70 px-1 pt-2">
                        <PhotoActions photo={photo} compact />
                        <AdminPhotoMenu
                          photoId={photo.id}
                          photoTitle={photo.title}
                          compact
                        />
                      </div>
                    </figure>
                  </li>
                )
              })}
            </ul>

            <Pagination
              page={data.photos.page}
              totalPages={data.photos.totalPages}
              onPageChange={changePage}
              disabled={album.isFetching}
              className="pt-4"
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
