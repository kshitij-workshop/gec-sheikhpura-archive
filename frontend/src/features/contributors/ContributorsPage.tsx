import { useSearchParams } from 'react-router'

import {
  Alert,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Skeleton,
} from '../../components/ui'
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
    <div className="space-y-8">
      <PageHeader
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
        <p className="text-sm text-archive-muted" aria-live="polite">
          {contributors.data.totalElements === 1
            ? '1 published contributor'
            : `${String(contributors.data.totalElements)} published contributors`}
        </p>
      ) : null}

      {contributors.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-archive-line bg-archive-surface p-5"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-32" />
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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contributors.data.items.map((contributor) => (
              <li key={contributor.id}>
                <Card className="flex h-full flex-col gap-3 p-5">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-archive-accent-soft font-serif text-lg font-semibold text-archive-accent"
                  >
                    {initials(contributor.displayName)}
                  </span>
                  <div className="space-y-1">
                    <h2 className="font-serif text-xl font-semibold leading-snug tracking-tight">
                      {contributor.displayName}
                    </h2>
                    <p className="text-xs uppercase tracking-[0.15em] text-archive-muted">
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
                </Card>
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
