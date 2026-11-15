import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'

import {
  Alert,
  Button,
  Card,
  Dialog,
  EmptyState,
  PageHeader,
  Pagination,
  Skeleton,
  TextAreaField,
  buttonStyles,
} from '../../components/ui'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { requestRemoval } from '../../lib/api/contributionApi'
import type { UserPhoto } from '../../lib/api/types'
import { formatCredits, formatTimestamp } from '../../lib/format'
import { formatBytes } from '../../lib/uploadValidation'
import { StatusBadge } from './components/StatusBadge'
import { useMyPhotos } from './queries'

const PAGE_SIZE = 10

export default function MyUploadsPage() {
  const [page, setPage] = useState(0)
  const [target, setTarget] = useState<UserPhoto | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>(undefined)
  const [requestedIds, setRequestedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [notice, setNotice] = useState<string | null>(null)

  const photos = useMyPhotos(page, PAGE_SIZE)

  const removal = useMutation({
    mutationFn: (input: { photoId: string; reason: string }) =>
      requestRemoval(input.photoId, input.reason),
    onSuccess: (_request, variables) => {
      setRequestedIds((current) => new Set(current).add(variables.photoId))
      setTarget(null)
      setReason('')
      setNotice(
        'Removal request sent. A moderator will review it; the photograph stays visible until then.',
      )
    },
  })

  const openRemoval = (photo: UserPhoto) => {
    removal.reset()
    setTarget(photo)
    setReason('')
    setReasonError(undefined)
  }

  const closeRemoval = () => {
    if (removal.isPending) {
      return
    }
    setTarget(null)
    setReason('')
    setReasonError(undefined)
    removal.reset()
  }

  const submitRemoval = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (target === null) {
      return
    }
    const trimmed = reason.trim()
    if (trimmed.length === 0) {
      setReasonError('Explain briefly why the photograph should be removed.')
      return
    }
    if (trimmed.length > 1000) {
      setReasonError('Use 1000 characters or fewer.')
      return
    }

    setReasonError(undefined)
    removal.mutate({ photoId: target.id, reason: trimmed })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Member area"
        title="My uploads"
        description="Every photograph you have uploaded, including those still in review."
      />

      <Alert tone="info" title="Private until approved">
        Pending and rejected photographs are never exposed through public image
        URLs, so this page shows metadata and status instead of thumbnails.
      </Alert>

      {notice ? (
        <Alert tone="success" title="Request recorded">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{notice}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setNotice(null)
              }}
            >
              Dismiss
            </Button>
          </div>
        </Alert>
      ) : null}

      {photos.isError ? (
        <Alert tone="danger" title="Your uploads could not be loaded">
          Refresh the page to try again.
        </Alert>
      ) : null}

      {photos.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : null}

      {photos.data && photos.data.items.length === 0 ? (
        <EmptyState
          title="No uploads yet"
          description="Photographs you submit for review will appear here with their moderation status and recorded photographer credits."
          action={
            <Link
              to="/contribute"
              className={buttonStyles({ variant: 'primary', size: 'sm' })}
            >
              Share photographs
            </Link>
          }
        />
      ) : null}

      {photos.data && photos.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {photos.data.items.map((photo) => (
              <li key={photo.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="font-serif text-xl font-semibold tracking-tight">
                        {photo.title ?? 'Untitled photograph'}
                      </h2>
                      <p className="text-sm text-archive-muted">
                        {photo.eventTitle}
                        {photo.albumTitle ? ` · ${photo.albumTitle}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={photo.status} />
                  </div>

                  <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-archive-muted">
                        Format
                      </dt>
                      <dd className="font-medium uppercase">{photo.format}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-archive-muted">
                        Dimensions
                      </dt>
                      <dd className="font-medium">
                        {photo.widthPx} × {photo.heightPx}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-archive-muted">
                        File size
                      </dt>
                      <dd className="font-medium">
                        {formatBytes(photo.sizeBytes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-archive-muted">
                        Uploaded
                      </dt>
                      <dd className="font-medium">
                        {formatTimestamp(photo.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-sm text-archive-muted">
                    <span className="font-medium text-archive-ink">
                      Photographer credits:
                    </span>{' '}
                    {formatCredits(
                      photo.photographers.map((credit) => credit.creditName),
                    )}
                  </p>

                  {photo.status === 'REMOVED' ? (
                    <p className="text-sm text-archive-muted">
                      This photograph has been removed from the archive.
                    </p>
                  ) : requestedIds.has(photo.id) ? (
                    <p className="text-sm font-medium text-archive-info">
                      Removal request pending review.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        openRemoval(photo)
                      }}
                    >
                      Request removal
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          <Pagination
            page={photos.data.page}
            totalPages={photos.data.totalPages}
            onPageChange={setPage}
            disabled={photos.isFetching}
          />
        </>
      ) : null}

      <Dialog
        open={target !== null}
        onClose={closeRemoval}
        title="Request photograph removal"
        description={
          target
            ? `${target.title ?? 'Untitled photograph'} · ${target.eventTitle}`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={closeRemoval}
              disabled={removal.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="removal-request-form"
              variant="danger"
              isLoading={removal.isPending}
            >
              Send request
            </Button>
          </>
        }
      >
        <form
          id="removal-request-form"
          noValidate
          onSubmit={submitRemoval}
          className="space-y-3"
        >
          <p className="text-sm leading-relaxed text-archive-muted">
            A moderator reviews removal requests. The photograph is not deleted
            immediately, and its public visibility follows the moderator&apos;s
            decision.
          </p>

          {removal.isError ? (
            <Alert tone="danger" title="Request not sent">
              {requestFailureMessage(
                removal.error,
                'The removal request could not be sent. Please try again.',
              )}
            </Alert>
          ) : null}

          <TextAreaField
            id="removal-reason"
            label="Reason"
            hint="For example: the photograph identifies a student without consent."
            value={reason}
            error={reasonError}
            maxLength={1000}
            onChange={(event) => {
              setReason(event.target.value)
            }}
          />
        </form>
      </Dialog>
    </div>
  )
}
