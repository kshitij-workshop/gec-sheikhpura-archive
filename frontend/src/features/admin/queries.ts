import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  getModerationHistory,
  listAdminAlbums,
  listAdminEvents,
  listModerationQueue,
} from '../../lib/api/adminApi'
import type { PhotoStatus } from '../../lib/api/types'

export const adminKeys = {
  root: ['admin'] as const,
  moderationQueue: (status: PhotoStatus | null, page: number, size: number) =>
    ['admin', 'moderation', status, page, size] as const,
  moderationHistory: (photoId: string) =>
    ['admin', 'moderation-history', photoId] as const,
  photo: (photoId: string) => ['admin', 'photo', photoId] as const,
  eventAlbums: (eventId: string) => ['admin', 'albums', eventId] as const,
  eventOptions: ['admin', 'event-options'] as const,
}

export function useModerationQueue(
  status: PhotoStatus | null,
  page: number,
  size: number,
) {
  return useQuery({
    queryKey: adminKeys.moderationQueue(status, page, size),
    queryFn: () => listModerationQueue({ status, page, size }),
    placeholderData: keepPreviousData,
  })
}

/** Loads the append-only history for the photograph under review. */
export function useModerationHistory(photoId: string) {
  return useQuery({
    queryKey: adminKeys.moderationHistory(photoId),
    queryFn: () => getModerationHistory(photoId),
  })
}

/** Albums of one event, used when approval still needs an album. */
export function useEventAlbums(eventId: string | null) {
  return useQuery({
    queryKey: adminKeys.eventAlbums(eventId ?? 'none'),
    queryFn: () =>
      eventId === null ? Promise.resolve([]) : listAdminAlbums(eventId),
    enabled: eventId !== null,
  })
}

/**
 * Every event an administrator can file a photograph into.
 *
 * The administrative endpoint accepts up to 100 rows per page; one page is
 * enough for the filing picker and avoids pagination state in a dialog.
 */
export function useAdminEvents() {
  return useQuery({
    queryKey: adminKeys.eventOptions,
    queryFn: () => listAdminEvents(0, 100),
    select: (page) => page.items,
    staleTime: 60_000,
  })
}
