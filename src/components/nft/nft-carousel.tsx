import { useEffect, useRef, useState } from 'react'
import type { NftSummary } from '@/api/contracts'
import { NftCard } from '@/components/catalog/nft-card'
import { carouselItemClass, carouselTrackClass } from '@/components/nft-detail/layout'
import { cn } from '@/lib/utils'

export function NftCarouselTrack({ items, label }: { items: NftSummary[]; label: string }) {
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
        <nav aria-label={label} className="mt-6 flex justify-center gap-1">
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
