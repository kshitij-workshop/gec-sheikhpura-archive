import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Alert, Button, Dialog, TextAreaField } from '../../components/ui'
import { moderatePhoto } from '../../lib/api/adminApi'
import type { ModerationInput } from '../../lib/api/adminApi'
import type { ModerationAction, ModerationPhoto } from '../../lib/api/types'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { moderationActions } from './moderationActions'
import { PhotoFilingFields } from './PhotoFilingFields'
import { initialFilingDraft } from './photoFiling'
import type { PhotoFilingDraft } from './photoFiling'
import { adminKeys, useEventAlbums } from './queries'

function photoLabel(photo: ModerationPhoto): string {
  return photo.title ?? 'Untitled photograph'
}

export interface ModerationActionDialogProps {
  photo: ModerationPhoto
  action: ModerationAction
  onClose: () => void
  onModerated: (message: string) => void
}

/**
 * Confirmation step for one moderation transition.
 *
 * The server re-validates the transition and the reason rules; this dialog
 * mirrors them so a moderator sees the requirement before submitting.
 * Approval also invites a filing correction: the event, album, title, caption
 * and alternative text can all change in the same decision.
 */
export function ModerationActionDialog({
  photo,
  action,
  onClose,
  onModerated,
}: ModerationActionDialogProps) {
  const config = moderationActions[action]
  const queryClient = useQueryClient()
  const approving = action === 'approve'

  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>(undefined)
  const [filing, setFiling] = useState<PhotoFilingDraft>(() =>
    initialFilingDraft(photo),
  )
  const [albumError, setAlbumError] = useState<string | undefined>(undefined)

  const albums = useEventAlbums(
    approving && filing.eventId.length > 0 ? filing.eventId : null,
  )

  const mutation = useMutation({
    mutationFn: (input: ModerationInput) =>
      moderatePhoto(photo.id, action, input),
    onSuccess: () => {
      const albumTitle = albums.data?.find(
        (album) => album.id === filing.albumId,
      )?.title
      const message = approving
        ? albumTitle && albumTitle !== photo.albumTitle
          ? `“${photoLabel(photo)}” was approved and filed under ${albumTitle}.`
          : `“${photoLabel(photo)}” was approved.`
        : `“${photoLabel(photo)}” was ${config.past}.`

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin', 'moderation'],
        }),
        queryClient.invalidateQueries({
          queryKey: adminKeys.moderationHistory(photo.id),
        }),
        queryClient.invalidateQueries({
          queryKey: adminKeys.eventAlbums(filing.eventId),
        }),
      ])
      onModerated(message)
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = reason.trim()
    if (!approving) {
      if (config.reasonRequired && trimmed.length === 0) {
        setReasonError('Explain briefly why this action is needed.')
        return
      }
      if (trimmed.length > 1000) {
        setReasonError('Use 1000 characters or fewer.')
        return
      }
    }

    if (approving) {
      if (filing.eventId.length === 0) {
        setAlbumError('Choose the event that should hold this photograph.')
        return
      }
      if (filing.albumId.length === 0) {
        setAlbumError('Choose the album that should hold this photograph.')
        return
      }
    }

    setReasonError(undefined)
    setAlbumError(undefined)

    mutation.mutate(
      approving
        ? {
            albumId: filing.albumId,
            eventId: filing.eventId,
            title: filing.title,
            caption: filing.caption,
            altText: filing.altText,
          }
        : { reason: config.reasonRequired ? trimmed : null },
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={config.title}
      description={`${photoLabel(photo)} · ${photo.eventTitle}`}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={`moderation-form-${photo.id}`}
            variant={config.variant}
            isLoading={mutation.isPending}
          >
            {config.confirm}
          </Button>
        </>
      }
    >
      <form
        id={`moderation-form-${photo.id}`}
        noValidate
        onSubmit={submit}
        className="space-y-3"
      >
        <p className="leading-relaxed text-archive-muted">{config.description}</p>

        {mutation.isError ? (
          <Alert tone="danger" title="Action not applied">
            {requestFailureMessage(
              mutation.error,
              'The moderation action could not be applied. Refresh the queue and try again.',
            )}
          </Alert>
        ) : null}

        {approving ? (
          <PhotoFilingFields
            idPrefix={`moderation-${photo.id}`}
            draft={filing}
            albumError={albumError}
            disabled={mutation.isPending}
            currentEventTitle={photo.eventTitle}
            currentAlbumTitle={photo.albumTitle}
            onChange={(patch) => {
              setFiling((current) => ({ ...current, ...patch }))
              if (patch.albumId !== undefined) {
                setAlbumError(undefined)
              }
            }}
          />
        ) : null}

        {config.reasonRequired ? (
          <TextAreaField
            id={`moderation-reason-${photo.id}`}
            label="Reason"
            hint="Recorded in the photograph's moderation history and the audit log."
            value={reason}
            error={reasonError}
            maxLength={1000}
            onChange={(event) => {
              setReason(event.target.value)
              setReasonError(undefined)
            }}
          />
        ) : null}
      </form>
    </Dialog>
  )
}
