import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Alert, Button, TextAreaField, TextField } from '../../components/ui'
import { updateAdminAlbum } from '../../lib/api/adminApi'
import { requestFailureMessage } from '../../lib/api/errorMessage'
import type { AdminAlbum } from '../../lib/api/types'

interface AdminAlbumEditorProps {
  album: AdminAlbum
  onSaved: () => void
  onCancel: () => void
}

/**
 * Inline editor for an existing album. Titles only have to be unique inside
 * their own event, so the same album title can exist under different events.
 */
export function AdminAlbumEditor({
  album,
  onSaved,
  onCancel,
}: AdminAlbumEditorProps) {
  const client = useQueryClient()
  const [title, setTitle] = useState(album.title)
  const [description, setDescription] = useState(album.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(album.sortOrder))

  const save = useMutation({
    mutationFn: () =>
      updateAdminAlbum(album.id, {
        eventId: album.eventId,
        title,
        description: description.trim() === '' ? null : description,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        published: album.published,
      }),
    onSuccess: () => {
      void client.invalidateQueries()
      onSaved()
    },
  })

  return (
    <form
      className="mt-3 w-full space-y-3 border-t border-archive-line pt-3"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault()
        save.mutate()
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Album title"
          id={`album-title-${album.id}`}
          value={title}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          required
        />
        <TextField
          label="Display order"
          id={`album-order-${album.id}`}
          type="number"
          min={0}
          value={sortOrder}
          onChange={(changeEvent) => setSortOrder(changeEvent.target.value)}
        />
      </div>
      <TextAreaField
        label="Description"
        id={`album-description-${album.id}`}
        optional
        rows={3}
        value={description}
        onChange={(changeEvent) => setDescription(changeEvent.target.value)}
      />
      {save.isError ? (
        <Alert tone="danger" title="Could not update the album">
          {requestFailureMessage(save.error, 'Check the fields and try again.')}
        </Alert>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={save.isPending}>
          Save album
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={save.isPending}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-archive-muted">
        Public link: /archive/albums/{album.slug}
      </p>
    </form>
  )
}
