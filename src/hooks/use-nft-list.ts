import { keepPreviousData, useQuery, type QueryKey } from '@tanstack/react-query'
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

function sameOwner(left: QueryKey, right: QueryKey): boolean {
  return left[0] === right[0] && left[1] === right[1]
}

export function useCatalogList(params: NftListQuery, favoritesOf: { userId: string | null } | null) {
  const queryKey: QueryKey = favoritesOf
    ? queryKeys.favorites.list(favoritesOf.userId ?? '', params)
    : queryKeys.nfts.list(params)
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => listNfts(favoritesOf ? { ...params, favorites: true } : params, { signal }),
    enabled: !favoritesOf || favoritesOf.userId !== null,
    staleTime: CATALOG_STALE_TIME_MS,
    placeholderData: (previous, previousQuery) =>
      previousQuery && sameOwner(previousQuery.queryKey, queryKey) ? previous : undefined,
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
