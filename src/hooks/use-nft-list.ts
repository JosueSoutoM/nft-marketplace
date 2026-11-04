import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { NftListQuery } from '@/api/contracts'
import { listNfts } from '@/api/nfts'
import { queryKeys } from '@/lib/query-keys'

export const CATALOG_STALE_TIME_MS = 30_000

export const FEATURED_QUERY: NftListQuery = { featured: true, sort: 'recent', pageSize: 4 }

export function useNftList(params: NftListQuery) {
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => listNfts(params, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  })
}

export function useFeaturedNfts() {
  return useQuery({
    queryKey: queryKeys.nfts.list(FEATURED_QUERY),
    queryFn: ({ signal }) => listNfts(FEATURED_QUERY, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
    select: (data) => data.items,
  })
}
