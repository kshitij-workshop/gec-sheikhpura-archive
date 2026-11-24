import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  PageHeader,
  Pagination,
  SelectField,
  Skeleton,
  TextAreaField,
} from '../../components/ui'
import type { BadgeTone } from '../../components/ui'
import { StatusBadge } from '../../components/domain/StatusBadge'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import {
  listRemovalRequests,
  listReports,
  listSuggestions,
  resolveRemovalRequest,
  resolveReport,
  reviewSuggestion,
} from '../../lib/api/adminGovernanceApi'
import type {
  AdminEventSuggestion,
  AdminPhotoSummary,
  AdminRemovalRequest,
  AdminReport,
} from '../../lib/api/types'
import { cloudinaryImageUrl } from '../../lib/cloudinary'
import { formatTimestamp } from '../../lib/format'
import { AdminPhotoMenu } from './AdminPhotoMenu'
import { useAdminEvents } from './queries'

type Section = 'reports' | 'removals' | 'suggestions'
type QueueKind = 'reports' | 'removals'
type QueueItem = AdminReport | AdminRemovalRequest

type Target =
  | { kind: 'reports'; item: AdminReport }
  | { kind: 'removals'; item: AdminRemovalRequest }
  | { kind: 'suggestions'; item: AdminEventSuggestion }

const PAGE_SIZE = 10
const DEFAULT_STATUS = 'PENDING'

const sections: ReadonlyArray<{ value: Section; label: string }> = [
  { value: 'reports', label: 'Reports' },
  { value: 'removals', label: 'Removal requests' },
  { value: 'suggestions', label: 'Event suggestions' },
]

const statusOptions: Record<
  Section,
  ReadonlyArray<{ value: string; label: string }>
> = {
  reports: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'UNDER_REVIEW', label: 'Under review' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'DISMISSED', label: 'Dismissed' },
    { value: 'ALL', label: 'All statuses' },
  ],
  removals: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ALL', label: 'All statuses' },
  ],
  suggestions: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ALL', label: 'All statuses' },
  ],
}

const categoryOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'COPYRIGHT', label: 'Copyright concern' },
  { value: 'PRIVACY', label: 'Privacy concern' },
  { value: 'MISATTRIBUTION', label: 'Wrong photographer credit' },
  { value: 'OTHER', label: 'Something else' },
]

const categoryLabels: Record<string, string> = Object.fromEntries(
  categoryOptions.map((option) => [option.value, option.label]),
)

const statusTones: Record<string, BadgeTone> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
}

function readableStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function statusFromParam(value: string | null, section: Section): string {
  const options = statusOptions[section]
  return options.some((option) => option.value === value)
    ? (value as string)
    : DEFAULT_STATUS
}

function pageFromParam(value: string | null): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

function photoLabel(photo: AdminPhotoSummary): string {
  return photo.title?.trim() || 'Untitled photograph'
}

function PhotoPreview({ photo }: { photo: AdminPhotoSummary }) {
  const src = cloudinaryImageUrl(photo.cloudinaryPublicId, photo.format, {
    width: 480,
  })

  if (!src) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-archive-line bg-stone-50 px-3 text-center text-xs text-archive-muted">
        Preview unavailable in this deployment.
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={photo.title?.trim() || 'Photograph under review'}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-lg border border-archive-line bg-stone-100 object-cover"
    />
  )
}

function QueueCard({
  item,
  kind,
  onReview,
}: {
  item: QueueItem
  kind: QueueKind
  onReview: (target: Target) => void
}) {
  const photo = item.photo

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-48">
          <PhotoPreview photo={photo} />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h2 className="font-serif text-lg font-semibold tracking-tight">
                {photoLabel(photo)}
              </h2>
              <p className="text-sm text-archive-muted">
                {photo.eventTitle}
                {photo.albumTitle ? ` · ${photo.albumTitle}` : ' · No album'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={photo.status} />
              <Badge tone={statusTones[item.status] ?? 'neutral'}>
                {readableStatus(item.status)}
              </Badge>
            </div>
          </div>

          <dl className="grid gap-2 text-xs text-archive-muted sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="uppercase tracking-wide">Uploader</dt>
              <dd className="font-medium text-archive-ink">
                {photo.uploaderDisplayName}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Format</dt>
              <dd className="font-medium uppercase text-archive-ink">
                {photo.format}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Dimensions</dt>
              <dd className="font-medium text-archive-ink">
                {photo.widthPx} × {photo.heightPx}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Uploaded</dt>
              <dd className="font-medium text-archive-ink">
                {formatTimestamp(photo.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">
                {kind === 'reports' ? 'Reported' : 'Requested'}
              </dt>
              <dd className="font-medium text-archive-ink">
                {formatTimestamp(item.createdAt)}
              </dd>
            </div>
            {kind === 'reports' ? (
              <div>
                <dt className="uppercase tracking-wide">Category</dt>
                <dd className="font-medium text-archive-ink">
                  {(item as AdminReport).category in categoryLabels
                    ? categoryLabels[(item as AdminReport).category]
                    : (item as AdminReport).category}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="rounded-lg border border-archive-line bg-archive-surface px-3 py-2">
            <p className="text-sm leading-relaxed text-archive-ink">
              {kind === 'reports'
                ? (item as AdminReport).details || 'No further details provided.'
                : (item as AdminRemovalRequest).reason}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (kind === 'reports') {
                  onReview({ kind, item: item as AdminReport })
                } else {
                  onReview({ kind, item: item as AdminRemovalRequest })
                }
              }}
            >
              Review
            </Button>
            <AdminPhotoMenu
              photoId={photo.id}
              photoTitle={photo.title}
              compact
            />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function AdminGovernancePage() {
  const [params, setParams] = useSearchParams()
  const section: Section = sections.some(
    (item) => item.value === params.get('section'),
  )
    ? (params.get('section') as Section)
    : 'reports'
  const status = statusFromParam(params.get('status'), section)
  const page = pageFromParam(params.get('page'))
  const category = params.get('category') ?? ''
  const eventId = params.get('eventId') ?? ''
  const apiStatus = status === 'ALL' ? undefined : status

  const [target, setTarget] = useState<Target | null>(null)
  const [note, setNote] = useState('')
  const [decision, setDecision] = useState('')
  const [createEvent, setCreateEvent] = useState(false)
  const queryClient = useQueryClient()

  const events = useAdminEvents()

  const reports = useQuery({
    queryKey: [
      'admin',
      'reports',
      status,
      category,
      eventId,
      page,
    ],
    queryFn: () =>
      listReports({
        status: apiStatus,
        category: category || undefined,
        eventId: eventId || undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: section === 'reports',
  })
  const removals = useQuery({
    queryKey: ['admin', 'removals', status, eventId, page],
    queryFn: () =>
      listRemovalRequests({
        status: apiStatus,
        eventId: eventId || undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: section === 'removals',
  })
  const suggestions = useQuery({
    queryKey: ['admin', 'suggestions', status, page],
    queryFn: () => listSuggestions(apiStatus, page, PAGE_SIZE),
    enabled: section === 'suggestions',
  })

  const active = section === 'reports' ? reports : section === 'removals' ? removals : suggestions

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) {
        throw new Error('No item selected')
      }
      if (!note.trim()) {
        throw new Error('A resolution note is required.')
      }
      if (!decision) {
        throw new Error('Choose a decision.')
      }
      if (target.kind === 'reports') {
        return resolveReport(target.item.id, {
          status: decision,
          resolutionNote: note.trim(),
        })
      }
      if (target.kind === 'removals') {
        return resolveRemovalRequest(target.item.id, {
          status: decision,
          resolutionNote: note.trim(),
        })
      }
      return reviewSuggestion(target.item.id, {
        status: decision,
        reviewNote: note.trim(),
        createEvent,
      })
    },
    onSuccess: () => {
      setTarget(null)
      setNote('')
      setDecision('')
      setCreateEvent(false)
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        // Approving a removal request removes the photograph publicly.
        queryClient.invalidateQueries({ queryKey: ['archive'] }),
      ])
    },
  })

  const setSection = (next: Section) => {
    const search = new URLSearchParams(params)
    search.set('section', next)
    search.set('page', '0')
    search.set('status', DEFAULT_STATUS)
    search.delete('category')
    search.delete('eventId')
    setParams(search)
  }

  const changeFilter = (key: string, value: string) => {
    const search = new URLSearchParams(params)
    if (value.length === 0) {
      search.delete(key)
    } else {
      search.set(key, value)
    }
    search.set('page', '0')
    setParams(search)
  }

  const changePage = (nextPage: number) => {
    const search = new URLSearchParams(params)
    if (nextPage <= 0) {
      search.delete('page')
    } else {
      search.set('page', String(nextPage))
    }
    setParams(search)
  }

  const openReview = (next: Target) => {
    setTarget(next)
    setNote('')
    setDecision(
      next.kind === 'reports'
        ? 'RESOLVED'
        : next.kind === 'removals'
          ? 'APPROVED'
          : 'APPROVED',
    )
    setCreateEvent(false)
  }

  const clearFilters = () => {
    const search = new URLSearchParams(params)
    search.delete('category')
    search.delete('eventId')
    search.set('status', DEFAULT_STATUS)
    search.set('page', '0')
    setParams(search)
  }

  const items = active.data?.items ?? []
  const eventsUnavailable = events.isError
  const sectionStatusOptions = statusOptions[section]
  const showPhotoFilters = section === 'reports' || section === 'removals'
  const filtersActive = category.length > 0 || eventId.length > 0

  const dialogPhoto =
    target && target.kind !== 'suggestions' ? target.item.photo : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Governance queues"
        description="Review reports, removal requests, and community event suggestions. Each record shows the photograph it concerns."
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Governance queues">
        {sections.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={section === item.value ? 'primary' : 'secondary'}
            onClick={() => {
              setSection(item.value)
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Status"
          id="governance-status"
          value={status}
          onChange={(event) => {
            changeFilter('status', event.target.value)
          }}
        >
          {sectionStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        {section === 'reports' ? (
          <SelectField
            label="Report category"
            id="governance-category"
            value={category}
            onChange={(event) => {
              changeFilter('category', event.target.value)
            }}
          >
            <option value="">All categories</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        ) : null}

        {showPhotoFilters ? (
          <SelectField
            label="Event"
            id="governance-event"
            hint={
              eventsUnavailable
                ? 'Events could not be loaded. Refresh to filter by event.'
                : undefined
            }
            value={eventId}
            disabled={eventsUnavailable}
            onChange={(event) => {
              changeFilter('eventId', event.target.value)
            }}
          >
            <option value="">All events</option>
            {events.data?.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
                {event.published ? '' : ' (unpublished)'}
              </option>
            ))}
          </SelectField>
        ) : null}

        {showPhotoFilters ? (
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!filtersActive && status === DEFAULT_STATUS}
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {active.isError ? (
        <Alert tone="danger" title="Queue could not be loaded">
          {requestFailureMessage(active.error, 'Refresh and try again.')}
        </Alert>
      ) : null}

      {active.isPending ? <Skeleton className="h-48 w-full" /> : null}

      {!active.isPending && items.length === 0 ? (
        <EmptyState
          title="Nothing needs attention"
          description="There are no records in this queue with the selected filters."
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {section === 'suggestions'
              ? (items as AdminEventSuggestion[]).map((suggestion) => (
                  <li key={suggestion.id}>
                    <Card className="space-y-2 p-5">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <h2 className="font-serif text-xl font-semibold">
                            {suggestion.title}
                          </h2>
                          <p className="text-sm text-archive-muted">
                            {formatTimestamp(suggestion.createdAt)}
                          </p>
                        </div>
                        <Badge tone={statusTones[suggestion.status] ?? 'neutral'}>
                          {readableStatus(suggestion.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-archive-muted">
                        {suggestion.description || 'No description provided.'}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          openReview({ kind: 'suggestions', item: suggestion })
                        }}
                      >
                        Review
                      </Button>
                    </Card>
                  </li>
                ))
              : (items as QueueItem[]).map((item) => (
                  <li key={item.id}>
                    <QueueCard
                      item={item}
                      kind={section === 'reports' ? 'reports' : 'removals'}
                      onReview={openReview}
                    />
                  </li>
                ))}
          </ul>
          <Pagination
            page={active.data!.page}
            totalPages={active.data!.totalPages}
            onPageChange={changePage}
          />
        </>
      ) : null}

      {target ? (
        <Dialog
          open
          onClose={() => {
            setTarget(null)
          }}
          title="Review governance item"
          description="This decision is recorded in the audit log."
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setTarget(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                isLoading={mutation.isPending}
                onClick={() => {
                  mutation.mutate()
                }}
              >
                Record decision
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {dialogPhoto ? (
              <div className="flex items-center gap-3 rounded-lg border border-archive-line bg-archive-surface p-2">
                <div className="w-24 shrink-0">
                  <PhotoPreview photo={dialogPhoto} />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-sm font-semibold">
                    {photoLabel(dialogPhoto)}
                  </p>
                  <p className="text-xs text-archive-muted">
                    {dialogPhoto.eventTitle}
                    {dialogPhoto.albumTitle ? ` · ${dialogPhoto.albumTitle}` : ''}
                  </p>
                  <p className="text-xs text-archive-muted">
                    Uploaded by {dialogPhoto.uploaderDisplayName}
                  </p>
                </div>
              </div>
            ) : null}

            {mutation.isError ? (
              <Alert tone="danger" title="Decision not recorded">
                {requestFailureMessage(
                  mutation.error,
                  'Check the note and try again.',
                )}
              </Alert>
            ) : null}

            <SelectField
              label="Decision"
              id="governance-decision"
              value={decision}
              onChange={(event) => {
                setDecision(event.target.value)
              }}
            >
              {target.kind === 'reports' ? (
                <>
                  <option value="UNDER_REVIEW">Keep under review</option>
                  <option value="RESOLVED">Resolve</option>
                  <option value="DISMISSED">Dismiss</option>
                </>
              ) : target.kind === 'removals' ? (
                <>
                  <option value="APPROVED">Approve removal</option>
                  <option value="REJECTED">Reject removal</option>
                </>
              ) : (
                <>
                  <option value="APPROVED">Approve suggestion</option>
                  <option value="REJECTED">Reject suggestion</option>
                </>
              )}
            </SelectField>

            {target.kind === 'suggestions' && decision === 'APPROVED' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createEvent}
                  onChange={(event) => {
                    setCreateEvent(event.target.checked)
                  }}
                />
                Create a draft event
              </label>
            ) : null}

            <TextAreaField
              id="governance-note"
              label="Resolution note"
              required
              value={note}
              maxLength={1000}
              error={
                mutation.error instanceof Error &&
                (mutation.error.message.includes('required') ||
                  mutation.error.message.includes('Choose'))
                  ? mutation.error.message
                  : undefined
              }
              onChange={(event) => {
                setNote(event.target.value)
              }}
            />
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
