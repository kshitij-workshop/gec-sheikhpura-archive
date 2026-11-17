import type { ModerationPhoto } from '../../lib/api/types'

/**
 * The filing and display details an administrator can change while approving
 * a photograph or editing it afterwards.
 */
export interface PhotoFilingDraft {
  /** Event that owns the album. Changing it clears the album selection. */
  eventId: string
  albumId: string
  title: string
  caption: string
  altText: string
}

export function initialFilingDraft(photo: ModerationPhoto): PhotoFilingDraft {
  return {
    eventId: photo.eventId,
    albumId: photo.albumId ?? '',
    title: photo.title ?? '',
    caption: photo.caption ?? '',
    altText: photo.altText ?? '',
  }
}
