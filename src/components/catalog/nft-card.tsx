import { Link } from '@tanstack/react-router'
import type { NftRarity, NftSummary } from '@/api/contracts'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

const RARITY_BADGES: Partial<Record<NftRarity, string>> = {
  rare: 'Raro',
  legendary: 'Lendário',
}

const frameClass =
  'relative rounded-[1.25rem] bg-surface-card p-1 pb-5 md:rounded-none md:pt-[1.9375rem] md:pb-[1.1875rem]'
const imageClass = 'aspect-square w-full rounded-2xl md:rounded-xl'
const nameClass = 'mt-4 px-3 text-body leading-6 md:mt-5 md:px-0 md:text-body md:leading-[1.375rem]'
const priceClass =
  'relative flex h-6 items-baseline gap-2 overflow-hidden px-3 text-[1.125rem] leading-6 font-bold whitespace-nowrap md:px-0'

function isSoldOut(nft: NftSummary) {
  return nft.editions.every((edition) => edition.available === 0)
}

type NftCardProps = {
  nft: NftSummary
  eager?: boolean
}

export function NftCard({ nft, eager = false }: NftCardProps) {
  const badge = RARITY_BADGES[nft.rarity]
  const soldOut = isSoldOut(nft)

  return (
    <article className="group">
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="block rounded-[1.25rem] md:rounded-none"
      >
        <div className={frameClass}>
          <NftImage
            image={nft.image}
            sizes="(min-width: 1280px) 250px, (min-width: 768px) 30vw, 45vw"
            loading={eager ? 'eager' : 'lazy'}
            className={cn(imageClass, 'bg-surface-raised object-cover transition-transform group-hover:scale-[1.02]')}
          />
          {badge && (
            <span className="absolute top-1 left-1 rounded-tl-2xl bg-primary px-4 py-2 text-body-sm leading-4 text-primary-foreground uppercase md:hidden">
              {badge}
            </span>
          )}
          {soldOut && (
            <span className="absolute top-3 right-3 rounded-md bg-ink/85 px-2.5 py-1 text-caption font-bold text-foreground uppercase md:top-10 md:right-3">
              Esgotado
            </span>
          )}
        </div>
        <h3 className={cn(nameClass, 'truncate text-foreground group-hover:text-text-accent')}>{nft.name}</h3>
        <p className={priceClass}>
          <span className="shrink-0 text-text-accent">{formatEth(nft.price)}</span>
          {nft.compareAtPrice && (
            <>
              <span className="sr-only">, preço anterior {formatEth(nft.compareAtPrice)}</span>
              <s aria-hidden="true" className="min-w-0 truncate font-normal text-secondary max-md:hidden">
                {formatEth(nft.compareAtPrice)}
              </s>
            </>
          )}
        </p>
      </Link>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className={frameClass}>
        <Skeleton className={imageClass} />
      </div>
      <div className={cn(nameClass, 'flex h-6 items-center md:h-[1.375rem]')}>
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className={cn(priceClass, 'flex h-6 items-center')}>
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}
