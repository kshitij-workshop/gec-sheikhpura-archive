import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Alert, Button, Dialog } from '../../components/ui'
import { updatePhoto } from '../../lib/api/adminApi'
import type { ModerationPhoto } from '../../lib/api/types'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import { PhotoFilingFields } from './PhotoFilingFields'
import { initialFilingDraft } from './photoFiling'
import type { PhotoFilingDraft } from './photoFiling'
import { adminKeys } from './queries'

function photoLabel(photo: ModerationPhoto): string {
  return photo.title ?? 'Untitled photograph'
}

export interface PhotoEditDialogProps {
  photo: ModerationPhoto
  onClose: () => void
  onSaved: (message: string) => void
}

/**
 * Re-files or retitles a photograph without changing its moderation status.
 *
 * Editing is an administrator correction, not a transition: a pending
 * photograph stays pending and an approved one stays published.
 */
export function PhotoEditDialog({
  photo,
  onClose,
  onSaved,
}: PhotoEditDialogProps) {
  const queryClient = useQueryClient()
  const [filing, setFiling] = useState<PhotoFilingDraft>(() =>
    initialFilingDraft(photo),
  )
  const [albumError, setAlbumError] = useState<string | undefined>(undefined)

  const mutation = useMutation({
    mutationFn: (draft: PhotoFilingDraft) =>
      updatePhoto(photo.id, {
        albumId: draft.albumId,
        eventId: draft.eventId,
        title: draft.title,
        caption: draft.caption,
        altText: draft.altText,
      }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.root }),
        queryClient.invalidateQueries({ queryKey: ['archive'] }),
      ])
      onSaved(`“${photoLabel(photo)}” was updated.`)
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (filing.eventId.length === 0) {
      setAlbumError('Choose the event that should hold this photograph.')
      return
    }
    if (filing.albumId.length === 0) {
      setAlbumError('Choose the album that should hold this photograph.')
      return
    }

    setAlbumError(undefined)
    mutation.mutate(filing)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit photograph details"
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
            form={`photo-edit-form-${photo.id}`}
            variant="primary"
            isLoading={mutation.isPending}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form
        id={`photo-edit-form-${photo.id}`}
        noValidate
        onSubmit={submit}
        className="space-y-3"
      >
        <p className="leading-relaxed text-archive-muted">
          Filing and display details can be corrected at any time. The
          photograph&apos;s moderation status and history are unchanged.
        </p>

        {mutation.isError ? (
          <Alert tone="danger" title="Changes not saved">
            {requestFailureMessage(
              mutation.error,
              'The photograph details could not be saved. Refresh the queue and try again.',
            )}
          </Alert>
        ) : null}

        <PhotoFilingFields
          idPrefix={`photo-edit-${photo.id}`}
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
      </form>
    </Dialog>
  )
}
