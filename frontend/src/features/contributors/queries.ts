import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { fetchContributors } from '../../lib/api/archiveApi'
import { retryUnlessNotFound } from '../../lib/api/retry'

export function useContributors(page: number, size = 24) {
  return useQuery({
    queryKey: ['contributors', page, size],
    queryFn: () => fetchContributors(page, size),
    placeholderData: keepPreviousData,
    retry: retryUnlessNotFound,
  })
}
