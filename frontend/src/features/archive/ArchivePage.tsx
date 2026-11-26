import { Link, useSearchParams } from 'react-router'

import {
  Alert,
  Button,
  EmptyState,
  Pagination,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { EditorialHeader } from '../../components/editorial/EditorialHeader'
import type { EventQuery } from '../../lib/api/archiveApi'
import type { ArchiveFilterValues } from './components/ArchiveFilters'
import { ArchiveFilters } from './components/ArchiveFilters'
import { EventCard } from './components/EventCard'
import {
  useAcademicYears,
  useCategories,
  useEvents,
  usePhotoIndex,
} from './queries'

const PAGE_SIZE = 12

function pageFromParam(value: string | null): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0
}

export default function ArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const values: ArchiveFilterValues = {
    query: searchParams.get('q')?.trim() ?? '',
    academicYearId: searchParams.get('year') ?? '',
    categoryId: searchParams.get('category') ?? '',
    featured: searchParams.get('featured') === 'true',
  }
  const page = pageFromParam(searchParams.get('page'))

  const eventQuery: EventQuery = {
    page,
    size: PAGE_SIZE,
    query: values.query || undefined,
    academicYearId: values.academicYearId || undefined,
    categoryId: values.categoryId || undefined,
    featured: values.featured ? true : undefined,
  }

  const events = useEvents(eventQuery)
  const covers = usePhotoIndex()
  const years = useAcademicYears()
  const categories = useCategories()

  const updateFilters = (patch: Partial<ArchiveFilterValues>) => {
    const next = new URLSearchParams(searchParams)

    if ('query' in patch) {
      if (patch.query) {
        next.set('q', patch.query)
      } else {
        next.delete('q')
      }
    }
    if ('academicYearId' in patch) {
      if (patch.academicYearId) {
        next.set('year', patch.academicYearId)
      } else {
        next.delete('year')
      }
    }
    if ('categoryId' in patch) {
      if (patch.categoryId) {
        next.set('category', patch.categoryId)
      } else {
        next.delete('category')
      }
    }
    if ('featured' in patch) {
      if (patch.featured) {
        next.set('featured', 'true')
      } else {
        next.delete('featured')
      }
    }

    next.delete('page')
    setSearchParams(next)
  }

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 0) {
      next.delete('page')
    } else {
      next.set('page', String(nextPage + 1))
    }
    setSearchParams(next)
    document
      .getElementById('archive-results')
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const resetFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters =
    values.query.length > 0 ||
    values.academicYearId.length > 0 ||
    values.categoryId.length > 0 ||
    values.featured

  return (
    <div className="space-y-12">
      <EditorialHeader
        eyebrow="The collection"
        title="The archive"
        description="Every event and every photograph from Government Engineering College, Sheikhpura."
        actions={
          <Link
            to="/contribute"
            className={buttonStyles({ variant: 'primary' })}
          >
            Add photos
          </Link>
        }
      />

      <ArchiveFilters
        years={years.data ?? []}
        categories={categories.data ?? []}
        values={values}
        onChange={updateFilters}
        onReset={resetFilters}
      />

      <section
        id="archive-results"
        aria-labelledby="archive-results-heading"
        className="scroll-mt-28 space-y-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-archive-line pt-6">
          <h2
            id="archive-results-heading"
            className="font-serif text-2xl font-normal tracking-tight text-archive-ink"
          >
            Events
          </h2>
          <p className="text-[11px] uppercase tracking-[0.18em] text-archive-muted">
            {events.data
              ? events.data.totalElements === 1
                ? '1 event'
                : `${String(events.data.totalElements)} events`
              : 'Loading'}
          </p>
        </div>

        {events.isError ? (
          <Alert tone="danger" title="The archive could not be loaded">
            {events.error instanceof Error
              ? events.error.message
              : 'Please try again in a moment.'}
          </Alert>
        ) : null}

        {events.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
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
        ) : null}

        {events.data && events.data.items.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No events match these filters"
              description="Try a different academic year, category, or search term."
              action={
                <Button type="button" variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="The archive is just getting started"
              description="Published events will appear here once the first collection is reviewed and published."
            />
          )
        ) : null}

        {events.data && events.data.items.length > 0 ? (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.data.items.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} cover={covers.eventCovers.get(event.id)} />
                </li>
              ))}
            </ul>

            <Pagination
              page={events.data.page}
              totalPages={events.data.totalPages}
              onPageChange={changePage}
              disabled={events.isFetching}
              className="pt-4"
            />
          </>
        ) : null}
      </section>
    </div>
  )
}
