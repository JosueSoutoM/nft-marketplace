import { NftCardSkeleton } from '@/components/catalog/nft-card'
import { NftCarouselTrack } from '@/components/nft/nft-carousel'
import { Button } from '@/components/ui/button'
import { useCollectionNfts } from '@/hooks/use-nft-detail'
import { carouselItemClass, carouselTrackClass, collectionSectionClass } from './layout'

const SKELETON_COUNT = 5

type CollectionCarouselProps = {
  collectionId: string
  collectionName: string
  nftId: string
}

export function CollectionCarousel({ collectionId, collectionName, nftId }: CollectionCarouselProps) {
  const query = useCollectionNfts(collectionId, nftId)

  return (
    <section aria-labelledby="collection-title" aria-busy={query.isPending} className={collectionSectionClass}>
      <h2
        id="collection-title"
        className="border-b border-border-soft pb-2 text-body font-bold text-text-accent md:text-body-lg"
      >
        Mais desta coleção
        <span className="sr-only">: {collectionName}</span>
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
            <Button onClick={() => void query.refetch()} disabled={query.isFetching} className="font-bold">
              {query.isFetching ? 'Carregando…' : 'Tentar novamente'}
            </Button>
          </div>
        ) : query.data.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Não há outros NFTs desta coleção no momento.</p>
        ) : (
          <NftCarouselTrack items={query.data} label="Páginas de Mais desta coleção" />
        )}
      </div>
    </section>
  )
}
