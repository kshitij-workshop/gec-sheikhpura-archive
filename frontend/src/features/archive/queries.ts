import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  fetchAcademicYears,
  fetchAlbumBySlug,
  fetchCategories,
  fetchEventBySlug,
  fetchEvents,
  fetchRecentPhotos,
} from '../../lib/api/archiveApi'
import type { EventQuery } from '../../lib/api/archiveApi'
import { retryUnlessNotFound } from '../../lib/api/retry'
import { useAuth } from '../auth/useAuth'

/**
 * Public archive reads depend on who is signed in only because the server
 * marks photographs uploaded by the viewer. Guest and member caches must stay
 * separate so a guest's "no removal action" payload is never reused after
 * sign-in.
 */
function viewerKey(userId: string | undefined): string {
  return userId ?? 'guest'
}

export const archiveKeys = {
  events: (query: EventQuery) => ['archive', 'events', query] as const,
  event: (slug: string) => ['archive', 'event', slug] as const,
  album: (slug: string, page: number, viewer: string) =>
    ['archive', 'album', slug, page, viewer] as const,
  recentPhotos: (size: number, viewer: string) =>
    ['archive', 'recent-photos', size, viewer] as const,
  academicYears: ['archive', 'academic-years'] as const,
  categories: ['archive', 'categories'] as const,
}

export function useEvents(query: EventQuery) {
  return useQuery({
    queryKey: archiveKeys.events(query),
    queryFn: () => fetchEvents(query),
    placeholderData: keepPreviousData,
    retry: retryUnlessNotFound,
  })
}

export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: archiveKeys.event(slug ?? ''),
    queryFn: () => fetchEventBySlug(slug!),
    enabled: Boolean(slug),
    retry: retryUnlessNotFound,
  })
}

export function useAlbum(slug: string | undefined, page: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: archiveKeys.album(slug ?? '', page, viewerKey(user?.id)),
    queryFn: () => fetchAlbumBySlug(slug!, page),
    enabled: Boolean(slug),
    placeholderData: keepPreviousData,
    retry: retryUnlessNotFound,
  })
}

export function useAcademicYears() {
  return useQuery({
    queryKey: archiveKeys.academicYears,
    queryFn: fetchAcademicYears,
    staleTime: 5 * 60_000,
  })
}

export function useRecentPhotos(size = 6) {
  const { user } = useAuth()

  return useQuery({
    queryKey: archiveKeys.recentPhotos(size, viewerKey(user?.id)),
    queryFn: () => fetchRecentPhotos(0, size),
    staleTime: 60_000,
    retry: retryUnlessNotFound,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: archiveKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  })
}
