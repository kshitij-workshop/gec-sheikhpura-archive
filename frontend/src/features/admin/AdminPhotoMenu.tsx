import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Alert, Button, Dialog, Skeleton } from '../../components/ui'
import { StatusBadge } from '../../components/domain/StatusBadge'
import { getAdminPhoto } from '../../lib/api/adminApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import type { ModerationAction } from '../../lib/api/types'
import { cloudinaryImageUrl } from '../../lib/cloudinary'
import { formatCredits, formatTimestamp } from '../../lib/format'
import { useAuth } from '../auth/useAuth'
import { ModerationActionDialog } from './ModerationActionDialog'
import { PhotoEditDialog } from './PhotoEditDialog'
import {
  allowedModerationActions,
  moderationActions,
} from './moderationActions'
import { adminKeys } from './queries'

/**
 * Actions an administrator may take from a public archive surface. Approval
 * and rejection stay in the moderation queue: a photograph visible here has
 * already been published, so the useful decisions are flag, hide, remove and
 * restore. Edit details is offered separately and never changes status.
 */
const publicActions: readonly ModerationAction[] = [
  'flag',
  'hide',
  'remove',
  'restore',
]

export interface AdminPhotoMenuProps {
  photoId: string
  /** Used for accessible names and the dialog description. */
  photoTitle?: string | null
  compact?: boolean
  className?: string
}

function titleOf(value: string | null | undefined): string {
  return value?.trim() || 'Untitled photograph'
}

/**
 * Role-gated management entry point attached to published photographs.
 *
 * The component is invisible to everyone except administrators, and the API
 * authorizes every action again. The current status is fetched on demand so
 * only actions the server will accept are offered.
 */
export function AdminPhotoMenu({
  photoId,
  photoTitle,
  compact = false,
  className,
}: AdminPhotoMenuProps) {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin =
    status === 'authenticated' &&
    (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')

  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<ModerationAction | null>(null)
  const [editing, setEditing] = useState(false)

  const details = useQuery({
    queryKey: adminKeys.photo(photoId),
    queryFn: () => getAdminPhoto(photoId),
    enabled: isAdmin && open,
    staleTime: 0,
  })

  if (!isAdmin) {
    return null
  }

  const label = titleOf(photoTitle ?? details.data?.title)
  const closeManage = () => {
    if (action !== null || editing) {
      return
    }
    setOpen(false)
  }

  const refresh = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.root }),
      queryClient.invalidateQueries({ queryKey: ['archive'] }),
    ])
  }

  const finishAction = () => {
    setAction(null)
    setOpen(false)
    refresh()
  }

  const finishEdit = () => {
    setEditing(false)
    setOpen(false)
    refresh()
  }

  const photo = details.data
  const allowed = photo
    ? allowedModerationActions(photo.status).filter((candidate) =>
        publicActions.includes(candidate),
      )
    : []
  const preview = photo
    ? cloudinaryImageUrl(photo.cloudinaryPublicId, photo.format, {
        width: 640,
      })
    : null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        aria-label={`Manage ${label}`}
        onClick={() => {
          setOpen(true)
        }}
      >
        {compact ? 'Manage' : 'Manage photograph'}
      </Button>

      <Dialog
        open={open && action === null && !editing}
        onClose={closeManage}
        title="Manage photograph"
        description={label}
        footer={
          <Button
            type="button"
            variant="secondary"
            onClick={closeManage}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          {details.isPending ? (
            <>
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </>
          ) : details.isError ? (
            <Alert tone="danger" title="Photograph could not be loaded">
              {requestFailureMessage(
                details.error,
                'Refresh the page and try again.',
              )}
            </Alert>
          ) : photo ? (
            <>
              {preview ? (
                <img
                  src={preview}
                  alt={
                    photo.altText?.trim() ||
                    photo.title?.trim() ||
                    'Photograph under administration'
                  }
                  className="aspect-[4/3] w-full rounded-lg border border-archive-line bg-stone-100 object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-archive-line bg-stone-50 px-4 text-center text-sm text-archive-muted">
                  Preview unavailable in this deployment.
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-serif text-base font-semibold text-archive-ink">
                    {titleOf(photo.title)}
                  </p>
                  <p className="text-xs text-archive-muted">
                    {photo.eventTitle}
                    {photo.albumTitle ? ` · ${photo.albumTitle}` : ''}
                  </p>
                </div>
                <StatusBadge status={photo.status} />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs text-archive-muted">
                <div>
                  <dt className="uppercase tracking-wide">Uploader</dt>
                  <dd className="font-medium text-archive-ink">
                    {photo.uploaderDisplayName}
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
                  <dt className="uppercase tracking-wide">Photographers</dt>
                  <dd className="font-medium text-archive-ink">
                    {formatCredits(
                      photo.photographers.map((credit) => credit.creditName),
                    )}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 border-t border-archive-line pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={`Edit details: ${label}`}
                  onClick={() => {
                    setEditing(true)
                  }}
                >
                  Edit details
                </Button>
                {allowed.map((candidate) => {
                  const config = moderationActions[candidate]

                  return (
                    <Button
                      key={candidate}
                      type="button"
                      size="sm"
                      variant={config.variant}
                      aria-label={`${config.confirm}: ${label}`}
                      onClick={() => {
                        setAction(candidate)
                      }}
                    >
                      {config.confirm}
                    </Button>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      </Dialog>

      {photo && action !== null ? (
        <ModerationActionDialog
          photo={photo}
          action={action}
          onClose={() => {
            setAction(null)
          }}
          onModerated={finishAction}
        />
      ) : null}

      {photo && editing ? (
        <PhotoEditDialog
          photo={photo}
          onClose={() => {
            setEditing(false)
          }}
          onSaved={finishEdit}
        />
      ) : null}
    </>
  )
}
