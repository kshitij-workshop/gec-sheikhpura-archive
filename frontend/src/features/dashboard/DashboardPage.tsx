import { Link } from 'react-router'

import {
  Alert,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  buttonStyles,
} from '../../components/ui'
import { formatCredits, formatTimestamp } from '../../lib/format'
import { useAuth } from '../auth/useAuth'
import { StatusBadge } from '../../components/domain/StatusBadge'
import { useMyPhotos, useMySubmissions, useMySuggestions } from './queries'

function countLabel(count: number | undefined, singular: string, plural: string) {
  if (count === undefined) {
    return '—'
  }

  return count === 1 ? `1 ${singular}` : `${String(count)} ${plural}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const photos = useMyPhotos(0, 4)
  const submissions = useMySubmissions(0, 4)
  const suggestions = useMySuggestions(0, 4)

  const failed = photos.isError || submissions.isError || suggestions.isError

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Member area"
        title="Your dashboard"
        description={
          user
            ? `Welcome back, ${user.displayName}. Track your contributions through review.`
            : 'Track your contributions through review.'
        }
        actions={
          <Link
            to="/contribute"
            className={buttonStyles({ variant: 'primary' })}
          >
            Share photographs
          </Link>
        }
      />

      {failed ? (
        <Alert tone="danger" title="Some contribution data could not be loaded">
          Refresh the page to try again. Nothing you have already submitted is
          affected.
        </Alert>
      ) : null}

      <section aria-labelledby="contribution-summary" className="space-y-3">
        <h2
          id="contribution-summary"
          className="font-serif text-2xl font-semibold tracking-tight"
        >
          At a glance
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Photographs"
            value={
              photos.isPending
                ? undefined
                : countLabel(
                    photos.data?.totalElements,
                    'photograph',
                    'photographs',
                  )
            }
            to="/dashboard/uploads"
            linkLabel="Review uploads"
          />
          <SummaryCard
            label="Submissions"
            value={
              submissions.isPending
                ? undefined
                : countLabel(
                    submissions.data?.totalElements,
                    'submission',
                    'submissions',
                  )
            }
            to="/dashboard/submissions"
            linkLabel="View submissions"
          />
          <SummaryCard
            label="Event suggestions"
            value={
              suggestions.isPending
                ? undefined
                : countLabel(
                    suggestions.data?.totalElements,
                    'suggestion',
                    'suggestions',
                  )
            }
            to="/dashboard/suggestions"
            linkLabel="View suggestions"
          />
          <SummaryCard
            label="Next step"
            value="Contribute"
            to="/contribute"
            linkLabel="Start a submission"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="recent-uploads"
          className="space-y-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="recent-uploads"
              className="font-serif text-2xl font-semibold tracking-tight"
            >
              Recent uploads
            </h2>
            <Link
              to="/dashboard/uploads"
              className="text-sm font-medium text-archive-accent underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>

          {photos.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : photos.data && photos.data.items.length > 0 ? (
            <ul className="space-y-2">
              {photos.data.items.map((photo) => (
                <li key={photo.id}>
                  <Card className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium text-archive-ink">
                          {photo.title ?? 'Untitled photograph'}
                        </p>
                        <p className="text-sm text-archive-muted">
                          {photo.eventTitle}
                          {photo.albumTitle ? ` · ${photo.albumTitle}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={photo.status} />
                    </div>
                    <p className="text-xs text-archive-muted">
                      {formatCredits(
                        photo.photographers.map((credit) => credit.creditName),
                      )}{' '}
                      · added {formatTimestamp(photo.createdAt)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-archive-line px-4 py-6 text-sm text-archive-muted">
              No photographs yet.{' '}
              <Link
                to="/contribute"
                className="font-medium text-archive-accent underline-offset-4 hover:underline"
              >
                Share the first one
              </Link>
              .
            </p>
          )}
        </section>

        <section
          aria-labelledby="recent-submissions"
          className="space-y-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="recent-submissions"
              className="font-serif text-2xl font-semibold tracking-tight"
            >
              Recent submissions
            </h2>
            <Link
              to="/dashboard/submissions"
              className="text-sm font-medium text-archive-accent underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>

          {submissions.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : submissions.data && submissions.data.items.length > 0 ? (
            <ul className="space-y-2">
              {submissions.data.items.map((submission) => (
                <li key={submission.id}>
                  <Card className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium text-archive-ink">
                          {submission.eventTitle}
                        </p>
                        <p className="text-sm text-archive-muted">
                          {submission.albumTitle ?? 'No album selected'}
                        </p>
                      </div>
                      <StatusBadge status={submission.status} />
                    </div>
                    <p className="text-xs text-archive-muted">
                      Started {formatTimestamp(submission.createdAt)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No submissions yet"
              description="A submission groups photographs from one event so moderators can review them together."
              action={
                <Link
                  to="/contribute"
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  Create a submission
                </Link>
              }
            />
          )}
        </section>
      </div>

      <Card className="space-y-2 p-6">
        <h2 className="font-serif text-xl font-semibold tracking-tight">
          How review works
        </h2>
        <p className="text-sm leading-relaxed text-archive-muted">
          Every photograph is reviewed before publication. Uploads stay private
          while they are pending and appear on the public archive only after
          approval. Photographer credits are recorded from what you enter; the
          uploader is never assumed to be the photographer.
        </p>
      </Card>
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: string | undefined
  to: string
  linkLabel: string
}

function SummaryCard({ label, value, to, linkLabel }: SummaryCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between gap-3 p-5">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-archive-muted">
          {label}
        </p>
        {value === undefined ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="font-serif text-3xl font-semibold tracking-tight">
            {value}
          </p>
        )}
      </div>
      <Link
        to={to}
        className="text-sm font-medium text-archive-accent underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </Card>
  )
}
