import { Link } from 'react-router'

import {
  Alert,
  EmptyState,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { SectionHeading } from '../../components/editorial/SectionHeading'
import { EventCard } from '../archive/components/EventCard'
import { PhotoImage } from '../archive/components/PhotoImage'
import {
  useAcademicYears,
  useEvents,
  usePhotoIndex,
} from '../archive/queries'
import type { RecentPhoto } from '../../lib/api/types'

const galleryLayout = [
  { ratio: 'aspect-[4/5]', width: 900, height: 1125 },
  { ratio: 'aspect-square', width: 640, height: 640 },
  { ratio: 'aspect-[3/4]', width: 640, height: 853 },
  { ratio: 'aspect-square', width: 640, height: 640 },
  { ratio: 'aspect-[4/5]', width: 900, height: 1125 },
  { ratio: 'aspect-square', width: 640, height: 640 },
  { ratio: 'aspect-[3/4]', width: 640, height: 853 },
  { ratio: 'aspect-[4/5]', width: 640, height: 800 },
] as const

function EventGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="border border-archive-line bg-archive-surface/30"
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PhotoGridSkeleton() {
  return (
    <div className="columns-2 gap-3 sm:columns-3 sm:gap-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="mb-3 break-inside-avoid sm:mb-4">
          <Skeleton
            className={index % 3 === 0 ? 'aspect-[4/5] w-full' : 'aspect-square w-full'}
          />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function GalleryItem({ photo, index }: { photo: RecentPhoto; index: number }) {
  const layout = galleryLayout[index % galleryLayout.length]!

  return (
    <li className="mb-3 break-inside-avoid sm:mb-4">
      <figure>
        <Link
          to={`/albums/${photo.albumSlug}`}
          className="group block overflow-hidden border border-archive-line bg-archive-surface"
        >
          <PhotoImage
            photo={photo}
            width={layout.width}
            height={layout.height}
            crop="fill"
            eager={index === 0}
            className={`w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${layout.ratio}`}
          />
        </Link>
        <figcaption className="mt-2.5 space-y-1">
          <p className="line-clamp-1 font-serif text-base leading-snug text-archive-ink">
            {photo.title?.trim() || 'Untitled photograph'}
          </p>
          <p className="line-clamp-1 text-[10px] uppercase tracking-[0.12em] text-archive-muted">
            {photo.eventTitle} · {photo.albumTitle}
          </p>
        </figcaption>
      </figure>
    </li>
  )
}

export default function HomePage() {
  const photos = usePhotoIndex(60)
  const latest = useEvents({ size: 6 })
  const years = useAcademicYears()

  const archiveUnavailable = photos.isError || latest.isError
  const heroPhoto = photos.photos[0]
  const galleryPhotos = photos.photos.slice(0, 8)
  const ctaPhoto = photos.photos[4] ?? photos.photos[0]
  const events = latest.data?.items ?? []
  const yearsCount = years.data?.length ?? 0

  return (
    <div className="space-y-16 pb-4 sm:space-y-20">
      <section className="border-b border-archive-line pb-12 sm:pb-16">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
          <div className="lg:col-span-8">
            {photos.isPending ? (
              <Skeleton className="aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[16/9]" />
            ) : heroPhoto ? (
              <figure className="fade-in">
                <div className="overflow-hidden border border-archive-line bg-archive-surface">
                  <PhotoImage
                    photo={heroPhoto}
                    width={1600}
                    height={900}
                    crop="fill"
                    eager
                    className="aspect-[4/5] w-full object-cover sm:aspect-[16/10] lg:aspect-[16/9]"
                  />
                </div>
                <figcaption className="mt-2 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.14em] text-archive-muted">
                  <span className="line-clamp-1">
                    {heroPhoto.title?.trim() || 'From the archive'}
                  </span>
                  <span className="shrink-0 text-archive-accent">Latest addition</span>
                </figcaption>
              </figure>
            ) : (
              <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 border border-archive-line bg-archive-surface p-6 text-center sm:aspect-[16/10] lg:aspect-[16/9]">
                <p className="eyebrow text-archive-accent">The collection</p>
                <p className="max-w-sm font-serif text-2xl leading-tight tracking-tight text-archive-ink">
                  The first photographs are being reviewed.
                </p>
                <Link
                  to="/contribute"
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  Add a photograph
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between lg:col-span-4">
            <div>
              <p className="eyebrow text-archive-accent">
                Government Engineering College · Sheikhpura
              </p>
              <h1 className="mt-5 font-serif text-[clamp(2.75rem,6vw,4.5rem)] font-normal leading-[0.92] tracking-[-0.04em] text-archive-ink">
                Every Moment.
                <br />
                <span className="italic text-archive-accent">One Campus.</span>
                <br />
                Forever.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-archive-muted">
                The college, remembered in photographs.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/archive"
                  className={buttonStyles({ variant: 'primary' })}
                >
                  Explore the archive
                </Link>
                <Link
                  to="/contribute"
                  className={buttonStyles({ variant: 'secondary' })}
                >
                  Add your photos
                </Link>
              </div>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-archive-line pt-5">
              <div>
                <dt className="eyebrow text-archive-muted">Photos</dt>
                <dd className="mt-1.5 font-serif text-2xl tracking-tight text-archive-ink">
                  {photos.data ? photos.data.totalElements : '—'}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-archive-muted">Events</dt>
                <dd className="mt-1.5 font-serif text-2xl tracking-tight text-archive-ink">
                  {latest.data ? latest.data.totalElements : '—'}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-archive-muted">Years</dt>
                <dd className="mt-1.5 font-serif text-2xl tracking-tight text-archive-ink">
                  {yearsCount > 0 ? yearsCount : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {archiveUnavailable ? (
        <Alert tone="warning" title="The archive is temporarily unavailable">
          Photos could not be loaded right now. Please try again in a moment.
        </Alert>
      ) : null}

      <section aria-labelledby="recent-photos-heading" className="space-y-6">
        <SectionHeading
          id="recent-photos-heading"
          index="01"
          title="Recently added photographs"
          action={
            <Link
              to="/archive"
              className="editorial-link text-sm font-medium text-archive-ink"
            >
              Browse the archive
            </Link>
          }
        />

        {photos.isPending ? <PhotoGridSkeleton /> : null}

        {photos.data && photos.data.items.length === 0 ? (
          <EmptyState
            title="No photographs published yet"
            description="The first reviewed photographs will appear here."
            action={
              <Link
                to="/contribute"
                className={buttonStyles({ variant: 'secondary' })}
              >
                Add photos
              </Link>
            }
          />
        ) : null}

        {galleryPhotos.length > 0 ? (
          <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4">
            {galleryPhotos.map((photo, index) => (
              <GalleryItem key={photo.id} photo={photo} index={index} />
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="latest-heading" className="space-y-6">
        <SectionHeading
          id="latest-heading"
          index="02"
          title="Recently added"
          action={
            <Link
              to="/archive"
              className="editorial-link text-sm font-medium text-archive-ink"
            >
              View every event
            </Link>
          }
        />

        {latest.isPending ? <EventGridSkeleton /> : null}

        {latest.data && latest.data.items.length === 0 ? (
          <EmptyState
            title="The public archive is just getting started"
            description="New events will appear here once they are published."
          />
        ) : null}

        {events.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <li key={event.id}>
                <EventCard
                  event={event}
                  cover={photos.eventCovers.get(event.id)}
                  emphasis={index === 0}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {years.data && years.data.length > 0 ? (
        <section aria-labelledby="years-heading" className="space-y-6">
          <SectionHeading id="years-heading" index="03" title="Browse by year" />
          <ul className="flex flex-wrap gap-2">
            {years.data.map((year) => (
              <li key={year.id}>
                <Link
                  to={`/archive?year=${year.id}`}
                  className="inline-flex items-center border border-archive-line px-5 py-2.5 font-serif text-base tracking-tight text-archive-ink transition-colors hover:border-archive-accent hover:text-archive-accent"
                >
                  {year.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="contribute-heading"
        className="grid overflow-hidden border border-archive-line lg:grid-cols-12"
      >
        <div className="lg:col-span-7">
          {ctaPhoto ? (
            <PhotoImage
              photo={ctaPhoto}
              width={1200}
              height={800}
              crop="fill"
              className="h-full min-h-64 w-full object-cover lg:min-h-80"
            />
          ) : (
            <div className="h-full min-h-64 w-full bg-archive-surface lg:min-h-80" />
          )}
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-10 lg:col-span-5">
          <p className="eyebrow text-archive-accent">Add to the archive</p>
          <h2
            id="contribute-heading"
            className="font-serif text-3xl font-normal leading-[1.05] tracking-[-0.03em] text-archive-ink sm:text-4xl"
          >
            Have photos from college?
          </h2>
          <p className="text-sm leading-relaxed text-archive-muted">
            Share them with the archive. Every photo is reviewed and credited
            before it appears.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              to="/contribute"
              className={buttonStyles({ variant: 'primary' })}
            >
              Add photos
            </Link>
            <Link
              to="/about"
              className={buttonStyles({ variant: 'secondary' })}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
