import { useState } from 'react'
import { Link } from 'react-router'

import {
  Alert,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { formatTimestamp } from '../../lib/format'
import { StatusBadge } from '../../components/domain/StatusBadge'
import { useMySubmissions } from './queries'

const PAGE_SIZE = 10

export default function SubmissionsPage() {
  const [page, setPage] = useState(0)
  const submissions = useMySubmissions(page, PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Member area"
        title="Submissions"
        description="Submission batches group photographs from the same event for review."
      />

      {submissions.isError ? (
        <Alert tone="danger" title="Submissions could not be loaded">
          Refresh the page to try again.
        </Alert>
      ) : null}

      {submissions.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {submissions.data && submissions.data.items.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Each upload session creates a submission. Create one to group your photographs by event."
          action={
            <Link
              to="/contribute"
              className={buttonStyles({ variant: 'primary', size: 'sm' })}
            >
              Start a submission
            </Link>
          }
        />
      ) : null}

      {submissions.data && submissions.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {submissions.data.items.map((submission) => (
              <li key={submission.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="font-serif text-xl font-semibold tracking-tight">
                        {submission.eventTitle}
                      </h2>
                      <p className="text-sm text-archive-muted">
                        {submission.albumTitle ?? 'No album selected'}
                      </p>
                    </div>
                    <StatusBadge status={submission.status} />
                  </div>

                  {submission.note ? (
                    <p className="text-sm leading-relaxed text-archive-ink">
                      {submission.note}
                    </p>
                  ) : null}

                  <p className="text-xs text-archive-muted">
                    Started {formatTimestamp(submission.createdAt)} · updated{' '}
                    {formatTimestamp(submission.updatedAt)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>

          <Pagination
            page={submissions.data.page}
            totalPages={submissions.data.totalPages}
            onPageChange={setPage}
            disabled={submissions.isFetching}
          />
        </>
      ) : null}
    </div>
  )
}
