import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeaturedNfts } from '@/hooks/use-nft-list'
import { splitFeatured } from './featured'

const imageClass = 'aspect-[310/366] w-full rounded-[1.25rem]'

export function FeaturedSpotlight() {
  const featured = useFeaturedNfts()
  const spotlight = featured.data ? splitFeatured(featured.data).spotlight : null

  if (featured.isSuccess && !spotlight) {
    return null
  }

  return (
    <section aria-labelledby="spotlight-title" className="bg-linear-to-b from-surface-card to-ink to-60%">
      <h2 id="spotlight-title" className="px-5 pt-6 text-[1.375rem] leading-7 font-bold text-text-accent uppercase">
        NFT em destaque
      </h2>
      <p className="mt-2 pb-3 text-center text-[1.25rem] leading-7 font-bold text-foreground uppercase">
        Oferta limitada
      </p>
      {featured.isPending ? (
        <Skeleton className={imageClass} />
      ) : spotlight ? (
        <Link to="/nfts/$nftId" params={{ nftId: spotlight.id }} className="block rounded-[1.25rem]">
          <NftImage
            image={spotlight.image}
            sizes="310px"
            className={`${imageClass} bg-surface-raised object-cover object-top`}
          />
        </Link>
      ) : (
        <div className={`${imageClass} bg-surface-raised`} />
      )}
    </section>
  )
}
