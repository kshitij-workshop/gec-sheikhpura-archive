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

export const archiveKeys = {
  events: (query: EventQuery) => ['archive', 'events', query] as const,
  event: (slug: string) => ['archive', 'event', slug] as const,
  album: (slug: string, page: number) =>
    ['archive', 'album', slug, page] as const,
  recentPhotos: (size: number) => ['archive', 'recent-photos', size] as const,
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
  return useQuery({
    queryKey: archiveKeys.album(slug ?? '', page),
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
  return useQuery({
    queryKey: archiveKeys.recentPhotos(size),
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
