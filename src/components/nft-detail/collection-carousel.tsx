import { useEffect, useRef, useState } from 'react'
import type { NftSummary } from '@/api/contracts'
import { NftCard, NftCardSkeleton } from '@/components/catalog/nft-card'
import { Button } from '@/components/ui/button'
import { useCollectionNfts } from '@/hooks/use-nft-detail'
import { cn } from '@/lib/utils'
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
          <CarouselTrack items={query.data} />
        )}
      </div>
    </section>
  )
}

function CarouselTrack({ items }: { items: NftSummary[] }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }
    function update() {
      if (!track) {
        return
      }
      const step = track.clientWidth + parseFloat(getComputedStyle(track).columnGap || '0')
      const total = Math.max(1, Math.ceil((track.scrollWidth + 1) / step))
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1
      setPages(total)
      setPage(atEnd ? total - 1 : Math.min(total - 1, Math.round(track.scrollLeft / step)))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(track)
    track.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      track.removeEventListener('scroll', update)
    }
  }, [items.length])

  function goTo(index: number) {
    const track = trackRef.current
    if (!track) {
      return
    }
    const step = track.clientWidth + parseFloat(getComputedStyle(track).columnGap || '0')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ left: index * step, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <>
      <ul ref={trackRef} className={carouselTrackClass}>
        {items.map((nft) => (
          <li key={nft.id} className={carouselItemClass}>
            <NftCard nft={nft} />
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav aria-label="Páginas de Mais desta coleção" className="mt-6 flex justify-center gap-1">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Página ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => goTo(index)}
              className="flex size-6 items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2.5 rounded-full border border-primary',
                  index === page ? 'scale-110 bg-primary' : 'bg-transparent',
                )}
              />
            </button>
          ))}
        </nav>
      )}
    </>
  )
}
