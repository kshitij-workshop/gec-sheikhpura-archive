import { useSearchParams } from 'react-router'

import {
  Alert,
  EmptyState,
  Pagination,
  Skeleton,
} from '../../components/ui'
import { EditorialHeader } from '../../components/editorial/EditorialHeader'
import { useContributors } from './queries'

const PAGE_SIZE = 24

function pageFromParam(value: string | null): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ContributorsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = pageFromParam(searchParams.get('page'))
  const contributors = useContributors(page, PAGE_SIZE)

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 0) {
      next.delete('page')
    } else {
      next.set('page', String(nextPage + 1))
    }
    setSearchParams(next)
  }

  return (
    <div className="space-y-12">
      <EditorialHeader
        eyebrow="People"
        title="Contributors"
        description="Photographers and community members who have published profiles in the archive. Every credited photographer is named on the photographs they contributed."
      />

      {contributors.isError ? (
        <Alert tone="danger" title="The contributor directory could not be loaded">
          {contributors.error instanceof Error
            ? contributors.error.message
            : 'Please try again in a moment.'}
        </Alert>
      ) : null}

      {contributors.data ? (
        <p className="text-[11px] uppercase tracking-[0.18em] text-archive-muted" aria-live="polite">
          {contributors.data.totalElements === 1
            ? '1 published contributor'
            : `${String(contributors.data.totalElements)} published contributors`}
        </p>
      ) : null}

      {contributors.isPending ? (
        <div className="grid gap-px border border-archive-line bg-archive-line sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-4 bg-archive-paper p-6">
              <Skeleton className="h-12 w-12" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : null}

      {contributors.data && contributors.data.items.length === 0 ? (
        <EmptyState
          title="No published contributor profiles yet"
          description="Profiles appear here after an administrator publishes them. Photographs may still credit photographers who do not have a public profile."
        />
      ) : null}

      {contributors.data && contributors.data.items.length > 0 ? (
        <>
          <ul className="grid gap-px border border-archive-line bg-archive-line sm:grid-cols-2 lg:grid-cols-3">
            {contributors.data.items.map((contributor) => (
              <li key={contributor.id} className="bg-archive-paper">
                <article className="flex h-full flex-col gap-5 p-6 transition-colors duration-300 hover:bg-archive-surface sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center border border-archive-accent/40 font-serif text-sm tracking-[0.08em] text-archive-accent"
                    >
                      {initials(contributor.displayName)}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-archive-muted">
                      Contributor
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-serif text-2xl font-normal leading-snug tracking-tight text-archive-ink">
                      {contributor.displayName}
                    </h2>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-archive-muted">
                      @{contributor.slug}
                    </p>
                  </div>
                  {contributor.bio ? (
                    <p className="text-sm leading-relaxed text-archive-muted">
                      {contributor.bio}
                    </p>
                  ) : (
                    <p className="text-sm italic text-archive-muted">
                      No biography provided.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>

          <Pagination
            page={contributors.data.page}
            totalPages={contributors.data.totalPages}
            onPageChange={changePage}
            disabled={contributors.isFetching}
          />
        </>
      ) : null}
    </div>
  )
}
