import { useState } from 'react'

import { Alert, Button, Card, Skeleton } from '../../components/ui'
import { StatusBadge } from '../../components/domain/StatusBadge'
import { statusLabel } from '../../components/domain/contributionStatus'
import { cloudinaryImageUrl } from '../../lib/cloudinary'
import type {
  ModerationAction,
  ModerationHistoryEntry,
  ModerationPhoto,
} from '../../lib/api/types'
import { formatCredits, formatTimestamp } from '../../lib/format'
import { formatBytes } from '../../lib/uploadValidation'
import { allowedModerationActions, historyActionLabel, moderationActions } from './moderationActions'
import { useModerationHistory } from './queries'

const historyRoles: Record<string, string> = {
  USER: 'Member',
  ADMIN: 'Administrator',
  SUPER_ADMIN: 'Super administrator',
}

function photoLabel(photo: ModerationPhoto): string {
  return photo.title ?? 'Untitled photograph'
}

function previewAltText(photo: ModerationPhoto): string {
  return (
    photo.altText?.trim() ||
    photo.title?.trim() ||
    'Photograph awaiting moderation'
  )
}

function Transition({ entry }: { entry: ModerationHistoryEntry }) {
  const from = entry.fromStatus ? statusLabel(entry.fromStatus) : 'Not recorded'

  return (
    <p className="text-sm font-medium text-archive-ink">
      {from} → {statusLabel(entry.toStatus)}
    </p>
  )
}

function ModerationHistory({ photoId }: { photoId: string }) {
  const history = useModerationHistory(photoId)

  if (history.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (history.isError) {
    return (
      <Alert tone="danger" title="History could not be loaded">
        Refresh the page to try again.
      </Alert>
    )
  }

  if (history.data.length === 0) {
    return (
      <p className="text-sm text-archive-muted">
        No moderation transitions have been recorded yet.
      </p>
    )
  }

  return (
    <ol className="space-y-3">
      {history.data.map((entry) => (
        <li
          key={entry.id}
          className="rounded-lg border border-archive-line px-3 py-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-archive-ink">
              {entry.actorDisplayName}{' '}
              <span className="font-normal text-archive-muted">
                · {historyRoles[entry.actorRole] ?? entry.actorRole}
              </span>
            </p>
            <p className="text-xs text-archive-muted">
              {formatTimestamp(entry.createdAt)}
            </p>
          </div>
          <p className="text-sm font-medium text-archive-ink">
            {historyActionLabel(entry.action)}
          </p>
          <Transition entry={entry} />
          {entry.reason ? (
            <p className="mt-1 text-sm text-archive-muted">{entry.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export interface ModerationPhotoCardProps {
  photo: ModerationPhoto
  onAction: (photo: ModerationPhoto, action: ModerationAction) => void
}

/**
 * One photograph in the moderation queue.
 *
 * The preview uses the admin-only Cloudinary identifier from the moderation
 * read model. When the deployment has no cloud name the card shows a
 * placeholder rather than a broken image or a leaked asset URL.
 */
export function ModerationPhotoCard({
  photo,
  onAction,
}: ModerationPhotoCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const preview = cloudinaryImageUrl(photo.cloudinaryPublicId, photo.format, {
    width: 640,
  })
  const actions = allowedModerationActions(photo.status)
  const title = photoLabel(photo)

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div>
          {preview ? (
            <img
              src={preview}
              alt={previewAltText(photo)}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-lg border border-archive-line bg-stone-100 object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-archive-line bg-stone-50 px-4 text-center">
              <p className="text-sm font-medium text-archive-muted">
                Preview unavailable
              </p>
              <p className="text-xs text-archive-muted">
                This deployment has no Cloudinary configuration.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2
                id={`moderation-photo-${photo.id}`}
                className="font-serif text-xl font-semibold tracking-tight"
              >
                {title}
              </h2>
              <p className="text-sm text-archive-muted">
                {photo.eventTitle}
                {photo.albumTitle
                  ? ` · ${photo.albumTitle}`
                  : ' · No album assigned'}
              </p>
            </div>
            <StatusBadge status={photo.status} />
          </div>

          {photo.caption ? (
            <p className="text-sm leading-relaxed text-archive-muted">
              {photo.caption}
            </p>
          ) : null}

          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
              <dd className="font-medium">{formatBytes(photo.sizeBytes)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-archive-muted">
                Taken
              </dt>
              <dd className="font-medium">
                {photo.takenAt ? formatTimestamp(photo.takenAt) : 'Not recorded'}
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
            <div>
              <dt className="text-xs uppercase tracking-wide text-archive-muted">
                Uploader
              </dt>
              <dd className="font-medium">{photo.uploaderDisplayName}</dd>
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

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const config = moderationActions[action]

              return (
                <Button
                  key={action}
                  type="button"
                  size="sm"
                  variant={config.variant}
                  aria-label={`${config.confirm}: ${title}`}
                  onClick={() => {
                    onAction(photo, action)
                  }}
                >
                  {config.confirm}
                </Button>
              )
            })}
          </div>

          <div className="space-y-3 border-t border-archive-line pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={historyOpen}
              aria-controls={`moderation-history-${photo.id}`}
              onClick={() => {
                setHistoryOpen((current) => !current)
              }}
            >
              {historyOpen ? 'Hide moderation history' : 'Show moderation history'}
            </Button>

            {historyOpen ? (
              <div id={`moderation-history-${photo.id}`}>
                <ModerationHistory photoId={photo.id} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}
