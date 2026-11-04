import type { NftEdition } from '@/api/contracts'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

export function NftPrice({ edition, className }: { edition: NftEdition; className?: string }) {
  return (
    <p data-slot="nft-price" className={cn('font-bold text-text-accent', className)}>
      <span className="sr-only">Preço da edição {edition.label}: </span>
      {formatEth(edition.price)}
      {edition.compareAtPrice && (
        <>
          <span className="sr-only">, preço anterior </span>
          <s className="ml-2 text-body font-normal text-secondary">{formatEth(edition.compareAtPrice)}</s>
        </>
      )}
    </p>
  )
}
