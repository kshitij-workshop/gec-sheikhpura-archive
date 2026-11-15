import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  listMyPhotos,
  listMySuggestions,
  listSubmissions,
} from '../../lib/api/contributionApi'

export const contributionKeys = {
  submissions: (page: number, size: number) =>
    ['me', 'submissions', page, size] as const,
  photos: (page: number, size: number) => ['me', 'photos', page, size] as const,
  suggestions: (page: number, size: number) =>
    ['me', 'event-suggestions', page, size] as const,
}

export function useMySubmissions(page = 0, size = 10) {
  return useQuery({
    queryKey: contributionKeys.submissions(page, size),
    queryFn: () => listSubmissions(page, size),
    placeholderData: keepPreviousData,
  })
}

export function useMyPhotos(page = 0, size = 10) {
  return useQuery({
    queryKey: contributionKeys.photos(page, size),
    queryFn: () => listMyPhotos(page, size),
    placeholderData: keepPreviousData,
  })
}

export function useMySuggestions(page = 0, size = 10) {
  return useQuery({
    queryKey: contributionKeys.suggestions(page, size),
    queryFn: () => listMySuggestions(page, size),
    placeholderData: keepPreviousData,
  })
}
