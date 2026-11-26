import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useMutation } from '@tanstack/react-query'

import {
  Alert,
  Button,
  Dialog,
  SelectField,
  TextAreaField,
} from '../../../components/ui'
import { reportPhoto, requestRemoval } from '../../../lib/api/contributionApi'
import type { ReportCategory } from '../../../lib/api/types'
import { requestFailureMessage } from '../../../lib/api/errorMessage'
import { useAuth } from '../../auth/useAuth'

export interface PhotoActionsPhoto {
  id: string
  title: string | null
  /** Server-computed: true only for the uploader of this photograph. */
  viewerCanRequestRemoval: boolean
}

export interface PhotoActionsProps {
  photo: PhotoActionsPhoto
  /** Smaller, quieter controls for a grid card. */
  compact?: boolean
  className?: string
}

const reportCategories: ReadonlyArray<{
  value: ReportCategory
  label: string
}> = [
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'COPYRIGHT', label: 'Copyright concern' },
  { value: 'PRIVACY', label: 'Privacy concern' },
  { value: 'MISATTRIBUTION', label: 'Wrong photographer credit' },
  { value: 'OTHER', label: 'Something else' },
]

function photoLabel(photo: PhotoActionsPhoto): string {
  return photo.title?.trim() || 'Untitled photograph'
}

/**
 * Report and uploader-only removal controls for a published photograph.
 *
 * Reporting requires an account, so guests get a sign-in link that returns to
 * the current page. The removal button is shown only when the server marked
 * the viewer as the uploader; the API authorizes every request again.
 */
export function PhotoActions({
  photo,
  compact = false,
  className,
}: PhotoActionsProps) {
  const { status, user } = useAuth()
  const location = useLocation()

  const [dialog, setDialog] = useState<'report' | 'removal' | null>(null)
  const [category, setCategory] = useState<ReportCategory>('INAPPROPRIATE')
  const [details, setDetails] = useState('')
  const [reason, setReason] = useState('')
  const [detailsError, setDetailsError] = useState<string | undefined>(undefined)
  const [reasonError, setReasonError] = useState<string | undefined>(undefined)
  const [reported, setReported] = useState(false)
  const [removalRequested, setRemovalRequested] = useState(false)

  const closeDialog = () => {
    if (report.isPending || removal.isPending) {
      return
    }
    setDialog(null)
    setDetailsError(undefined)
    setReasonError(undefined)
  }

  const report = useMutation({
    mutationFn: () =>
      reportPhoto(photo.id, {
        category,
        details: details.trim().length === 0 ? null : details.trim(),
      }),
    onSuccess: () => {
      setDialog(null)
      setDetails('')
      setReported(true)
    },
  })

  const removal = useMutation({
    mutationFn: () => requestRemoval(photo.id, reason.trim()),
    onSuccess: () => {
      setDialog(null)
      setReason('')
      setRemovalRequested(true)
    },
  })

  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (details.length > 1000) {
      setDetailsError('Use 1000 characters or fewer.')
      return
    }

    setDetailsError(undefined)
    report.mutate()
  }

  const submitRemoval = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

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
    removal.mutate()
  }

  if (status === 'loading') {
    return null
  }

  if (status !== 'authenticated' || user === null) {
    return (
      <p className={className}>
        <Link
          to="/sign-in"
          state={{ from: `${location.pathname}${location.search}` }}
          aria-label={`Sign in to report ${photoLabel(photo)}`}
          className={[
            'transition-colors',
            compact
              ? 'text-[10px] uppercase tracking-[0.14em] text-archive-muted hover:text-archive-accent'
              : 'text-xs font-medium text-archive-accent underline-offset-4 hover:underline',
          ].join(' ')}
        >
          {compact ? 'Report' : 'Sign in to report this photograph'}
        </Link>
      </p>
    )
  }

  return (
    <>
      <div
        className={[
          'flex flex-wrap items-center gap-2',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {reported ? (
          <span className="text-xs font-medium text-archive-info">
            Report sent for review.
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Report ${photoLabel(photo)}`}
            onClick={() => {
              report.reset()
              setDialog('report')
            }}
          >
            Report
          </Button>
        )}

        {photo.viewerCanRequestRemoval ? (
          removalRequested ? (
            <span className="text-xs font-medium text-archive-info">
              Removal request pending review.
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size={compact ? 'sm' : 'md'}
              aria-label={`Request removal of ${photoLabel(photo)}`}
              onClick={() => {
                removal.reset()
                setDialog('removal')
              }}
            >
              Request removal
            </Button>
          )
        ) : null}
      </div>

      {dialog === 'report' ? (
        <Dialog
          open
          onClose={closeDialog}
          title="Report this photograph"
          description={photoLabel(photo)}
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={closeDialog}
                disabled={report.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={`report-photo-${photo.id}`}
                variant="danger"
                isLoading={report.isPending}
              >
                Send report
              </Button>
            </>
          }
        >
          <form
            id={`report-photo-${photo.id}`}
            noValidate
            onSubmit={submitReport}
            className="space-y-3"
          >
            <p className="text-sm leading-relaxed text-archive-muted">
              Administrators review every report. Reporting a photograph does not
              remove it automatically.
            </p>

            {report.isError ? (
              <Alert tone="danger" title="Report not sent">
                {requestFailureMessage(
                  report.error,
                  'The report could not be sent. Please try again.',
                )}
              </Alert>
            ) : null}

            <SelectField
              id={`report-category-${photo.id}`}
              label="Reason"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as ReportCategory)
              }}
            >
              {reportCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <TextAreaField
              id={`report-details-${photo.id}`}
              label="Details"
              optional
              hint="Share what an administrator should look at. Do not include personal contact details."
              value={details}
              error={detailsError}
              maxLength={1000}
              rows={3}
              onChange={(event) => {
                setDetails(event.target.value)
                setDetailsError(undefined)
              }}
            />
          </form>
        </Dialog>
      ) : null}

      {dialog === 'removal' ? (
        <Dialog
          open
          onClose={closeDialog}
          title="Request photograph removal"
          description={photoLabel(photo)}
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={closeDialog}
                disabled={removal.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={`removal-request-${photo.id}`}
                variant="danger"
                isLoading={removal.isPending}
              >
                Send request
              </Button>
            </>
          }
        >
          <form
            id={`removal-request-${photo.id}`}
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
              id={`removal-reason-${photo.id}`}
              label="Reason for removal"
              hint="For example: the photograph identifies a student without consent."
              value={reason}
              error={reasonError}
              maxLength={1000}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError(undefined)
              }}
            />
          </form>
        </Dialog>
      ) : null}
    </>
  )
}
