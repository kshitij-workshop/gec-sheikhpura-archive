import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'

import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeader,
  SelectField,
  Skeleton,
  TextAreaField,
  TextField,
  buttonStyles,
} from '../../components/ui'
import type { BadgeTone } from '../../components/ui'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import {
  authorizeUpload,
  createSubmission,
  registerPhoto,
} from '../../lib/api/contributionApi'
import type { Submission } from '../../lib/api/types'
import { uploadImageToCloudinary } from '../../lib/cloudinaryUpload'
import { formatEventDate } from '../../lib/format'
import { useEvents } from '../archive/queries'
import {
  DEFAULT_ALLOWED_FORMATS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  MAX_PHOTOS_PER_SUBMISSION,
  fileProblem,
  formatBytes,
} from '../../lib/uploadValidation'

type UploadState = 'ready' | 'uploading' | 'registering' | 'done' | 'failed'

interface QueueItem {
  key: string
  file: File
  title: string
  takenAt: string
  creditName: string
  status: UploadState
  problem: string | null
  message: string | null
}

const stateLabels: Record<UploadState, string> = {
  ready: 'Ready to upload',
  uploading: 'Uploading image…',
  registering: 'Verifying with the archive…',
  done: 'Registered for review',
  failed: 'Upload failed',
}

const stateTones: Record<UploadState, BadgeTone> = {
  ready: 'neutral',
  uploading: 'info',
  registering: 'info',
  done: 'success',
  failed: 'danger',
}

function isLocked(item: QueueItem): boolean {
  return (
    item.status === 'uploading' ||
    item.status === 'registering' ||
    item.status === 'done'
  )
}

function localDateTimeToIso(value: string): string | null {
  if (value.length === 0) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export default function ContributePage() {
  const queryClient = useQueryClient()
  const events = useEvents({ size: 100 })

  const [eventId, setEventId] = useState('')
  const [albumId, setAlbumId] = useState('')
  const [note, setNote] = useState('')
  const [batchCredit, setBatchCredit] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [fileIssues, setFileIssues] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const counter = useRef(0)

  const selectedEvent = events.data?.items.find((event) => event.id === eventId)
  const albums = selectedEvent?.albums ?? []
  const pendingItems = queue.filter((item) => item.status === 'ready')
  const failedCount = queue.filter((item) => item.status === 'failed').length
  const doneCount = queue.filter((item) => item.status === 'done').length

  const updateItem = (key: string, patch: Partial<QueueItem>) => {
    setQueue((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = ''

    const room = Math.max(0, MAX_PHOTOS_PER_SUBMISSION - queue.length)
    const issues: string[] = []
    const accepted: QueueItem[] = []

    for (const file of files) {
      const problem = fileProblem(file, {
        maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
        allowedFormats: DEFAULT_ALLOWED_FORMATS,
      })

      if (problem !== null) {
        issues.push(`${file.name}: ${problem}`)
        continue
      }
      if (accepted.length >= room) {
        issues.push(
          `${file.name}: a submission holds at most ${String(MAX_PHOTOS_PER_SUBMISSION)} photographs.`,
        )
        continue
      }

      counter.current += 1
      accepted.push({
        key: `upload-${String(counter.current)}`,
        file,
        title: '',
        takenAt: '',
        creditName: '',
        status: 'ready',
        problem: null,
        message: null,
      })
    }

    if (accepted.length > 0) {
      setQueue((current) => [...current, ...accepted])
      setNotice(null)
    }
    setFileIssues(issues)
  }

  const applyBatchCredit = () => {
    const name = batchCredit.trim()
    if (name.length === 0) {
      return
    }

    setQueue((current) =>
      current.map((item) =>
        (item.status === 'ready' || item.status === 'failed') &&
        item.creditName.trim().length === 0
          ? { ...item, creditName: name, problem: null }
          : item,
      ),
    )
  }

  const removeItem = (key: string) => {
    setQueue((current) => current.filter((item) => item.key !== key))
  }

  const validateItems = (items: QueueItem[]): boolean => {
    let valid = true

    for (const item of items) {
      let problem: string | null = null

      if (item.creditName.trim().length === 0) {
        problem = 'Record who took this photograph.'
      } else if (item.creditName.trim().length > 120) {
        problem = 'Photographer names are limited to 120 characters.'
      } else if (item.title.trim().length > 160) {
        problem = 'Titles are limited to 160 characters.'
      } else if (item.takenAt.length > 0 && localDateTimeToIso(item.takenAt) === null) {
        problem = 'The taken-at time is not valid.'
      }

      if (problem !== null) {
        valid = false
      }
      updateItem(item.key, { problem })
    }

    return valid
  }

  const processItem = async (
    item: QueueItem,
    submissionId: string,
  ): Promise<boolean> => {
    updateItem(item.key, {
      status: 'uploading',
      problem: null,
      message: null,
    })

    try {
      const authorization = await authorizeUpload(submissionId)
      updateItem(item.key, { status: 'registering' })

      const publicId = await uploadImageToCloudinary(item.file, authorization)

      await registerPhoto(submissionId, {
        authorizationId: authorization.authorizationId,
        publicId,
        title: item.title.trim() || null,
        takenAt: localDateTimeToIso(item.takenAt),
        photographers: [{ creditName: item.creditName.trim() }],
      })

      updateItem(item.key, {
        status: 'done',
        message: 'The photograph is private until a moderator approves it.',
      })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      return true
    } catch (error) {
      updateItem(item.key, {
        status: 'failed',
        message: requestFailureMessage(
          error,
          'The photograph could not be uploaded. You can retry it.',
        ),
      })
      return false
    }
  }

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    if (submission === null && eventId.length === 0) {
      setFormError('Choose the event these photographs belong to.')
      return
    }
    if (pendingItems.length === 0) {
      setFormError('Add at least one photograph before starting the upload.')
      return
    }
    if (!validateItems(pendingItems)) {
      setFormError('Complete the highlighted photographer credits and details.')
      return
    }

    setStarting(true)

    try {
      let submissionId: string

      if (submission === null) {
        const created = await createSubmission({
          eventId,
          albumId: albumId || null,
          note: note.trim() || null,
        })
        setSubmission(created)
        submissionId = created.id
      } else {
        submissionId = submission.id
      }

      let succeeded = 0
      for (const item of pendingItems) {
        if (await processItem(item, submissionId)) {
          succeeded += 1
        }
      }

      setNotice(
        succeeded === pendingItems.length
          ? `${String(succeeded)} ${succeeded === 1 ? 'photograph' : 'photographs'} registered for review.`
          : `${String(succeeded)} of ${String(pendingItems.length)} photographs registered for review. Retry the failed items below.`,
      )
    } catch (error) {
      setFormError(
        requestFailureMessage(
          error,
          'The submission could not be created. Please try again.',
        ),
      )
    } finally {
      setStarting(false)
    }
  }

  const retryItem = async (item: QueueItem) => {
    if (submission === null || starting) {
      return
    }
    if (!validateItems([item])) {
      return
    }

    setStarting(true)
    try {
      await processItem(item, submission.id)
    } finally {
      setStarting(false)
    }
  }

  const resetBatch = () => {
    setQueue([])
    setSubmission(null)
    setEventId('')
    setAlbumId('')
    setNote('')
    setBatchCredit('')
    setFileIssues([])
    setFormError(null)
    setNotice(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contribute"
        title="Share photographs"
        description="Submit photographs for review. Images upload directly to the archive's image host; the API never receives the bytes."
      />

      <Alert tone="info" title="Attribution comes first">
        Record the photographer for every image. The uploader and the
        photographer are separate people in the archive, and the uploader is
        never assumed to have taken the photograph.
      </Alert>

      {notice ? (
        <Alert tone="success" title="Upload complete">
          <p>{notice}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/dashboard/uploads"
              className={buttonStyles({ variant: 'primary', size: 'sm' })}
            >
              Review my uploads
            </Link>
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

      {formError ? (
        <Alert tone="danger" title="Upload not started">
          {formError}
        </Alert>
      ) : null}

      {fileIssues.length > 0 ? (
        <Alert tone="danger" title="Some files were not added">
          <ul className="list-disc space-y-1 pl-5">
            {fileIssues.map((issue, index) => (
              <li key={`${issue}-${String(index)}`}>{issue}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {submission ? (
        <Alert tone="info" title="Uploading to a saved submission">
          <p>
            {submission.eventTitle}
            {submission.albumTitle ? ` · ${submission.albumTitle}` : ''}
          </p>
          <p className="mt-1">
            Additional files join this submission until you start another one.
          </p>
        </Alert>
      ) : null}

      <form
        noValidate
        onSubmit={(event) => {
          void handleStart(event)
        }}
        className="space-y-6"
      >
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              1. Where do these photographs belong?
            </h2>
            <p className="text-sm text-archive-muted">
              Only published events are listed. Choose an album only if the
              photographs belong to one.
            </p>
          </div>

          {events.isError ? (
            <Alert tone="danger" title="Events could not be loaded">
              Refresh the page to try again.
            </Alert>
          ) : null}

          {events.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : events.data && events.data.items.length === 0 ? (
            <Alert tone="warning" title="No published events yet">
              An administrator must publish an event before photographs can be
              attached to it. You can{' '}
              <Link
                to="/dashboard/suggestions"
                className="font-medium underline underline-offset-4"
              >
                suggest an event
              </Link>
              .
            </Alert>
          ) : (
            <>
              <SelectField
                id="contribute-event"
                label="Event"
                value={eventId}
                disabled={submission !== null || starting}
                onChange={(event) => {
                  setEventId(event.target.value)
                  setAlbumId('')
                }}
                hint="Only published events appear here."
              >
                <option value="">Choose an event</option>
                {(events.data?.items ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title} · {formatEventDate(option.eventDate)}
                  </option>
                ))}
              </SelectField>

              {albums.length > 0 ? (
                <SelectField
                  id="contribute-album"
                  label="Album"
                  optional
                  value={albumId}
                  disabled={submission !== null || starting}
                  onChange={(event) => {
                    setAlbumId(event.target.value)
                  }}
                >
                  <option value="">No album</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
                </SelectField>
              ) : selectedEvent ? (
                <p className="text-sm text-archive-muted">
                  This event has no published albums. Photographs will be
                  attached to the event itself.
                </p>
              ) : null}

              <TextAreaField
                id="contribute-note"
                label="Note for reviewers"
                optional
                hint="Context such as the occasion, location, or class batch."
                value={note}
                maxLength={2000}
                disabled={submission !== null || starting}
                onChange={(event) => {
                  setNote(event.target.value)
                }}
              />
            </>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              2. Add photographs
            </h2>
            <p className="text-sm text-archive-muted">
              JPEG, PNG, or WebP up to {formatBytes(DEFAULT_MAX_FILE_SIZE_BYTES)}{' '}
              each, with at most {MAX_PHOTOS_PER_SUBMISSION} photographs per
              submission. Files are checked again by the server.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="contribute-files"
              className="text-sm font-medium text-archive-ink"
            >
              Photographs
            </label>
            <input
              id="contribute-files"
              name="photographs"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              disabled={starting}
              onChange={handleFiles}
              aria-describedby="contribute-files-hint"
              className="block w-full rounded-md border border-archive-line bg-archive-surface px-3 py-2 text-sm text-archive-ink file:mr-3 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-archive-ink"
            />
            <p id="contribute-files-hint" className="text-xs text-archive-muted">
              {queue.length} of {MAX_PHOTOS_PER_SUBMISSION} files selected.
            </p>
          </div>

          {queue.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-archive-line bg-stone-50 p-4">
              <TextField
                id="contribute-batch-credit"
                label="Apply one photographer credit to files with no credit"
                hint="This never overwrites a credit you entered on an individual file."
                value={batchCredit}
                maxLength={120}
                disabled={starting}
                onChange={(event) => {
                  setBatchCredit(event.target.value)
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={starting || batchCredit.trim().length === 0}
                onClick={applyBatchCredit}
              >
                Apply credit
              </Button>
            </div>
          ) : null}

          {queue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-archive-line px-4 py-8 text-center text-sm text-archive-muted">
              No photographs selected yet. Add files to describe and upload
              them.
            </p>
          ) : (
            <ol className="space-y-3">
              {queue.map((item) => (
                <li key={item.key}>
                  <div className="space-y-3 rounded-lg border border-archive-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium text-archive-ink">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-archive-muted">
                          {formatBytes(item.file.size)} ·{' '}
                          {item.file.type || 'image'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={stateTones[item.status]}>
                          {stateLabels[item.status]}
                        </Badge>
                        {!isLocked(item) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={starting}
                            onClick={() => {
                              removeItem(item.key)
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {item.problem ? (
                      <p className="text-sm font-medium text-archive-danger">
                        {item.problem}
                      </p>
                    ) : null}

                    {item.message ? (
                      <p
                        role="status"
                        className={
                          item.status === 'failed'
                            ? 'text-sm text-archive-danger'
                            : 'text-sm text-archive-muted'
                        }
                      >
                        {item.message}
                      </p>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField
                        id={`${item.key}-title`}
                        label="Photograph title"
                        optional
                        value={item.title}
                        maxLength={160}
                        disabled={isLocked(item) || starting}
                        onChange={(event) => {
                          updateItem(item.key, { title: event.target.value })
                        }}
                      />

                      <TextField
                        id={`${item.key}-credit`}
                        label="Photographer credit"
                        hint="Who took this photograph? Required."
                        value={item.creditName}
                        maxLength={120}
                        disabled={isLocked(item) || starting}
                        onChange={(event) => {
                          updateItem(item.key, {
                            creditName: event.target.value,
                          })
                        }}
                      />
                    </div>

                    <TextField
                      id={`${item.key}-taken-at`}
                      type="datetime-local"
                      label="Taken at"
                      optional
                      value={item.takenAt}
                      disabled={isLocked(item) || starting}
                      onChange={(event) => {
                        updateItem(item.key, { takenAt: event.target.value })
                      }}
                    />

                    {item.status === 'failed' && !starting ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          void retryItem(item)
                        }}
                      >
                        Retry upload
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            isLoading={starting}
            disabled={
              starting ||
              pendingItems.length === 0 ||
              (submission === null && eventId.length === 0)
            }
          >
            {submission === null
              ? `Create submission and upload ${String(pendingItems.length)} ${pendingItems.length === 1 ? 'photograph' : 'photographs'}`
              : `Upload ${String(pendingItems.length)} ${pendingItems.length === 1 ? 'photograph' : 'photographs'}`}
          </Button>

          {submission !== null ? (
            <Button
              type="button"
              variant="secondary"
              disabled={starting}
              onClick={resetBatch}
            >
              Start another submission
            </Button>
          ) : null}
        </div>

        <p className="text-sm text-archive-muted">
          {doneCount > 0
            ? `${String(doneCount)} registered. `
            : ''}
          {failedCount > 0
            ? `${String(failedCount)} failed and can be retried individually. `
            : ''}
          Nothing becomes public until a moderator approves it.
        </p>
      </form>
    </div>
  )
}
