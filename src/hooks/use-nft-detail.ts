import { queryOptions, useQuery } from '@tanstack/react-query'
import { getNft, listNfts } from '@/api/nfts'
import type { NftListQuery } from '@/api/contracts'
import { queryKeys } from '@/lib/query-keys'
import { CATALOG_STALE_TIME_MS } from './use-nft-list'

export const COLLECTION_PAGE_SIZE = 16

export function nftDetailQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => getNft(nftId, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  })
}

export function useNftDetail(nftId: string) {
  return useQuery(nftDetailQueryOptions(nftId))
}

export function collectionQuery(collectionId: string): NftListQuery {
  return { collection: collectionId, sort: 'recent', pageSize: COLLECTION_PAGE_SIZE }
}

export function useCollectionNfts(collectionId: string, excludeNftId: string) {
  const params = collectionQuery(collectionId)
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => listNfts(params, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
    select: (data) => data.items.filter((item) => item.id !== excludeNftId),
  })
}
