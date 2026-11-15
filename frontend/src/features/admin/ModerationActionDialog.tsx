import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  Alert,
  Button,
  Dialog,
  SelectField,
  Skeleton,
  TextAreaField,
} from '../../components/ui'
import { moderatePhoto } from '../../lib/api/adminApi'
import type { ModerationAction, ModerationPhoto } from '../../lib/api/types'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { moderationActions } from './moderationActions'
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
 * mirrors them so a moderator sees the requirement before submitting. Approval
 * only asks for an album when the photograph does not already belong to one.
 */
export function ModerationActionDialog({
  photo,
  action,
  onClose,
  onModerated,
}: ModerationActionDialogProps) {
  const config = moderationActions[action]
  const queryClient = useQueryClient()
  const needsAlbum = action === 'approve' && photo.albumId === null
  const albums = useEventAlbums(needsAlbum ? photo.eventId : null)

  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>(undefined)
  const [albumId, setAlbumId] = useState('')
  const [albumError, setAlbumError] = useState<string | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: (input: { reason: string | null; albumId: string | null }) =>
      moderatePhoto(photo.id, action, input),
    onSuccess: () => {
      const albumTitle = albums.data?.find(
        (album) => album.id === albumId,
      )?.title
      const message =
        action === 'approve'
          ? albumTitle
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
      ])
      onModerated(message)
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = reason.trim()
    if (config.reasonRequired && trimmed.length === 0) {
      setReasonError('Explain briefly why this action is needed.')
      return
    }
    if (trimmed.length > 1000) {
      setReasonError('Use 1000 characters or fewer.')
      return
    }
    if (needsAlbum && albumId.length === 0) {
      setAlbumError('Choose the album that should hold this photograph.')
      return
    }

    setReasonError(undefined)
    setAlbumError(undefined)
    mutation.mutate({
      reason: config.reasonRequired ? trimmed : null,
      albumId: needsAlbum ? albumId : null,
    })
  }

  const noAlbumsAvailable =
    needsAlbum && albums.isSuccess && albums.data.length === 0

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
            disabled={noAlbumsAvailable}
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

        {needsAlbum ? (
          <>
            {albums.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : albums.isError ? (
              <Alert tone="danger" title="Albums could not be loaded">
                Approval needs an album. Refresh the page and try again.
              </Alert>
            ) : noAlbumsAvailable ? (
              <Alert tone="warning" title="This event has no albums">
                Create an album for {photo.eventTitle} before approving this
                photograph.
              </Alert>
            ) : (
              <SelectField
                id={`moderation-album-${photo.id}`}
                label="Album"
                hint="Unpublished albums keep the photograph out of the public archive until the album is published."
                value={albumId}
                error={albumError}
                onChange={(event) => {
                  setAlbumId(event.target.value)
                  setAlbumError(undefined)
                }}
              >
                <option value="">Choose an album</option>
                {albums.data.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                    {album.published ? '' : ' (unpublished)'}
                  </option>
                ))}
              </SelectField>
            )}
          </>
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
