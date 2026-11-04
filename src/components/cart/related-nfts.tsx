import { useQuery } from '@tanstack/react-query'
import type { NftListQuery } from '@/api/contracts'
import { listNfts } from '@/api/nfts'
import { NftCardSkeleton } from '@/components/catalog/nft-card'
import { NftCarouselTrack } from '@/components/nft/nft-carousel'
import { carouselItemClass, carouselTrackClass, collectionSectionClass } from '@/components/nft-detail/layout'
import { Button } from '@/components/ui/button'
import { CATALOG_STALE_TIME_MS } from '@/hooks/use-nft-list'
import { queryKeys } from '@/lib/query-keys'

const RELATED_QUERY: NftListQuery = { segment: 'trending', sort: 'rating-desc', pageSize: 16 }
const SKELETON_COUNT = 5

export function RelatedNfts({ excludeNftIds }: { excludeNftIds: readonly string[] }) {
  const query = useQuery({
    queryKey: queryKeys.nfts.list(RELATED_QUERY),
    queryFn: ({ signal }) => listNfts(RELATED_QUERY, { signal }),
    staleTime: CATALOG_STALE_TIME_MS,
  })
  const items = query.data?.items.filter((nft) => !excludeNftIds.includes(nft.id)) ?? []

  return (
    <section aria-labelledby="related-title" aria-busy={query.isPending} className={collectionSectionClass}>
      <h2 id="related-title" className="border-b border-border-soft pb-2 text-body font-bold text-text-accent md:text-body-lg">
        Colecionadores também viram
      </h2>
      <div className="mt-7">
        {query.isPending ? (
          <div className={carouselTrackClass}>
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div key={index} className={carouselItemClass}>
                <NftCardSkeleton />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-sm bg-surface-card p-6">
            <p className="text-body-sm text-text-secondary">{query.error.message}</p>
            <Button onClick={() => void query.refetch()} className="font-bold">
              Tentar novamente
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Não há outras sugestões no momento.</p>
        ) : (
          <NftCarouselTrack items={items} label="Páginas de Colecionadores também viram" />
        )}
      </div>
    </section>
  )
}
