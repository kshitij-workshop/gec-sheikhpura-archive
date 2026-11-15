import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  Alert,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  SelectField,
  Skeleton,
} from '../../components/ui'
import type { ModerationAction, ModerationPhoto, PhotoStatus } from '../../lib/api/types'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { ModerationActionDialog } from './ModerationActionDialog'
import { ModerationPhotoCard } from './ModerationPhotoCard'
import { useModerationQueue } from './queries'

const PAGE_SIZE = 10
const DEFAULT_STATUS: PhotoStatus = 'PENDING'

const photoStatuses = [
  'PENDING',
  'FLAGGED',
  'APPROVED',
  'REJECTED',
  'HIDDEN',
  'REMOVED',
] as const satisfies readonly PhotoStatus[]

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'FLAGGED', label: 'Flagged' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'ALL', label: 'All statuses' },
]

function statusFromParam(value: string | null): PhotoStatus | null {
  if (value === 'ALL') {
    return null
  }

  return photoStatuses.find((status) => status === value) ?? DEFAULT_STATUS
}

function pageFromParam(value: string | null): number {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0
}

function emptyCopy(status: PhotoStatus | null): {
  title: string
  description: string
} {
  if (status === 'PENDING') {
    return {
      title: 'The moderation queue is clear',
      description:
        'New community uploads appear here for review. Every photograph stays private until it is approved.',
    }
  }

  return {
    title: 'No photographs in this state',
    description:
      'Choose another status or return to pending review to see the rest of the archive.',
  }
}

export default function ModerationQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = statusFromParam(searchParams.get('status'))
  const page = pageFromParam(searchParams.get('page'))

  const [target, setTarget] = useState<{
    photo: ModerationPhoto
    action: ModerationAction
  } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const queue = useModerationQueue(status, page, PAGE_SIZE)

  const changeStatus = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === DEFAULT_STATUS) {
      next.delete('status')
    } else {
      next.set('status', value)
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
      .getElementById('moderation-results')
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const openAction = (photo: ModerationPhoto, action: ModerationAction) => {
    setNotice(null)
    setTarget({ photo, action })
  }

  const empty = queue.data ? emptyCopy(status) : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Moderation queue"
        description="Review community uploads, record a decision, and keep every transition in the audit trail."
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={queue.isFetching}
            onClick={() => {
              void queue.refetch()
            }}
          >
            Refresh queue
          </Button>
        }
      />

      <Alert tone="info" title="Administrator view">
        Pending photographs and their previews are visible only to moderators.
        They remain private to the public archive until approved.
      </Alert>

      {notice ? (
        <Alert tone="success" title="Decision recorded">
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

      <div className="max-w-xs">
        <SelectField
          id="moderation-status"
          label="Filter by status"
          value={status ?? 'ALL'}
          onChange={(event) => {
            changeStatus(event.target.value)
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      {queue.isError ? (
        <Alert tone="danger" title="The moderation queue could not be loaded">
          {requestFailureMessage(
            queue.error,
            'Refresh the page to try again. No moderation decisions were changed.',
          )}
        </Alert>
      ) : null}

      {queue.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {queue.data && queue.data.items.length === 0 && empty ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : null}

      {queue.data && queue.data.items.length > 0 ? (
        <section
          id="moderation-results"
          aria-label="Photographs awaiting review"
          className="space-y-3"
          aria-busy={queue.isFetching || undefined}
        >
          <p className="text-sm text-archive-muted">
            {queue.data.totalElements === 1
              ? '1 photograph'
              : `${String(queue.data.totalElements)} photographs`}
          </p>

          <ul className={queue.isFetching ? 'space-y-3 opacity-60' : 'space-y-3'}>
            {queue.data.items.map((photo) => (
              <li key={photo.id}>
                <ModerationPhotoCard photo={photo} onAction={openAction} />
              </li>
            ))}
          </ul>

          <Pagination
            page={queue.data.page}
            totalPages={queue.data.totalPages}
            onPageChange={changePage}
            disabled={queue.isFetching}
          />
        </section>
      ) : null}

      {target ? (
        <ModerationActionDialog
          key={`${target.photo.id}-${target.action}`}
          photo={target.photo}
          action={target.action}
          onClose={() => {
            setTarget(null)
          }}
          onModerated={(message) => {
            setTarget(null)
            setNotice(message)
          }}
        />
      ) : null}
    </div>
  )
}
