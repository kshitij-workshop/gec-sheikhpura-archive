import {
  Alert,
  SelectField,
  Skeleton,
  TextAreaField,
  TextField,
} from '../../components/ui'
import type { PhotoFilingDraft } from './photoFiling'
import { useAdminEvents, useEventAlbums } from './queries'

export interface PhotoFilingFieldsProps {
  idPrefix: string
  draft: PhotoFilingDraft
  onChange: (patch: Partial<PhotoFilingDraft>) => void
  albumError?: string
  disabled?: boolean
  /**
   * Title of the photograph's current event and album. They are rendered as
   * fallback options when the current selection falls outside the first page
   * of events or the event's album list.
   */
  currentEventTitle?: string
  currentAlbumTitle?: string | null
}

/**
 * Event, album, title, caption and alternative text for one photograph.
 *
 * The album decides which event the photograph belongs to because the server
 * keeps a composite `(album_id, event_id)` constraint. Picking a different
 * event therefore reloads its albums and requires a new album choice.
 */
export function PhotoFilingFields({
  idPrefix,
  draft,
  onChange,
  albumError,
  disabled = false,
  currentEventTitle,
  currentAlbumTitle,
}: PhotoFilingFieldsProps) {
  const events = useAdminEvents()
  const albums = useEventAlbums(draft.eventId.length > 0 ? draft.eventId : null)
  const noAlbumsAvailable =
    albums.isSuccess && albums.data.length === 0 && draft.albumId.length === 0
  const currentEventMissing =
    draft.eventId.length > 0 &&
    events.isSuccess &&
    !events.data.some((event) => event.id === draft.eventId)
  const currentAlbumMissing =
    draft.albumId.length > 0 &&
    albums.isSuccess &&
    !albums.data.some((album) => album.id === draft.albumId)

  return (
    <div className="space-y-3">
      {events.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : events.isError ? (
        <Alert tone="danger" title="Events could not be loaded">
          The photograph cannot be re-filed until the event list loads. Refresh
          the page and try again.
        </Alert>
      ) : (
        <SelectField
          id={`${idPrefix}-event`}
          label="Event"
          hint="Moving the photograph to another event also moves it between public archive sections."
          value={draft.eventId}
          disabled={disabled}
          onChange={(event) => {
            onChange({ eventId: event.target.value, albumId: '' })
          }}
        >
          <option value="">Choose an event</option>
          {currentEventMissing ? (
            <option value={draft.eventId}>
              {currentEventTitle ?? 'Current event'}
            </option>
          ) : null}
          {events.data.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
              {event.published ? '' : ' (unpublished)'}
            </option>
          ))}
        </SelectField>
      )}

      {draft.eventId.length === 0 ? (
        <Alert tone="warning" title="Choose an event">
          An album belongs to one event. Pick the event first, then choose the
          album that should hold this photograph.
        </Alert>
      ) : albums.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : albums.isError ? (
        <Alert tone="danger" title="Albums could not be loaded">
          Refresh the page and try again before saving.
        </Alert>
      ) : noAlbumsAvailable ? (
        <Alert tone="warning" title="This event has no albums">
          Create an album for this event before filing the photograph into it.
        </Alert>
      ) : (
        <SelectField
          id={`${idPrefix}-album`}
          label="Album"
          hint="Unpublished albums keep the photograph out of the public archive until the album is published."
          value={draft.albumId}
          error={albumError}
          disabled={disabled}
          onChange={(event) => {
            onChange({ albumId: event.target.value })
          }}
        >
          <option value="">Choose an album</option>
          {currentAlbumMissing ? (
            <option value={draft.albumId}>
              {currentAlbumTitle ?? 'Current album'}
            </option>
          ) : null}
          {albums.data.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
              {album.published ? '' : ' (unpublished)'}
            </option>
          ))}
        </SelectField>
      )}

      <TextField
        id={`${idPrefix}-title`}
        label="Title"
        maxLength={160}
        value={draft.title}
        disabled={disabled}
        onChange={(event) => {
          onChange({ title: event.target.value })
        }}
      />

      <TextAreaField
        id={`${idPrefix}-caption`}
        label="Caption"
        maxLength={2000}
        rows={3}
        value={draft.caption}
        disabled={disabled}
        onChange={(event) => {
          onChange({ caption: event.target.value })
        }}
      />

      <TextAreaField
        id={`${idPrefix}-alt-text`}
        label="Alternative text"
        hint="Describes the photograph for visitors who cannot see it. Leave blank only when the title is descriptive enough."
        maxLength={300}
        rows={2}
        value={draft.altText}
        disabled={disabled}
        onChange={(event) => {
          onChange({ altText: event.target.value })
        }}
      />
    </div>
  )
}
