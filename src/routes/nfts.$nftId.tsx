import { useCallback, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { BackButton } from '@/components/layout/back-button'
import { FavoriteButton } from '@/components/favorites/favorite-button'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { CollectionCarousel } from '@/components/nft-detail/collection-carousel'
import { breadcrumbClass, pageClass, topGridClass } from '@/components/nft-detail/layout'
import { NftDetailSkeleton } from '@/components/nft-detail/nft-detail-skeleton'
import { NftLoadError, NftNotFoundState } from '@/components/nft-detail/nft-detail-states'
import { NftDetailTabs } from '@/components/nft-detail/nft-detail-tabs'
import { NftGallery } from '@/components/nft-detail/nft-gallery'
import { NftInfo } from '@/components/nft-detail/nft-info'
import { NftMobileBar } from '@/components/nft-detail/nft-mobile-bar'
import { useAddToCartAction } from '@/components/nft-detail/use-add-to-cart-action'
import { useEditionChangeFeedback } from '@/components/nft-detail/use-edition-change-feedback'
import { nftDetailQueryOptions, useNftDetail } from '@/hooks/use-nft-detail'
import { clampQuantity, limitReason, maxQuantity, resolveEdition, validateNftDetailSearch } from '@/lib/nft-edition'

export const Route = createFileRoute('/nfts/$nftId')({
  staticData: { hideMobileTabBar: true, mobileActionBar: true },
  validateSearch: validateNftDetailSearch,
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQueryOptions(params.nftId))
  },
  component: NftDetailsPage,
})

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const query = useNftDetail(nftId)

  if (query.isPending) {
    return <NftDetailSkeleton />
  }
  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) {
      return <NftNotFoundState />
    }
    return <NftLoadError message={query.error.message} retrying={query.isFetching} onRetry={() => void query.refetch()} />
  }
  return <NftDetailView key={query.data.id} nft={query.data} />
}

function NftDetailView({ nft }: { nft: Nft }) {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [initialEditionId] = useState(() => resolveEdition(nft, search.edition).id)
  const edition = resolveEdition(nft, search.edition ?? initialEditionId)
  const max = maxQuantity(edition)
  const reason = limitReason(edition)
  const [quantity, setQuantity] = useState(1)
  const shareUrl = `${window.location.origin}/nfts/${encodeURIComponent(nft.id)}`

  const changeQuantity = useCallback((next: number) => setQuantity(next), [])
  useEditionChangeFeedback(nft, edition, quantity, changeQuantity)
  const cartAction = useAddToCartAction(nft, edition, quantity, reason)

  function selectEdition(editionId: string) {
    const next = nft.editions.find((item) => item.id === editionId)
    if (!next) {
      return
    }
    void navigate({ search: { edition: editionId }, replace: true, resetScroll: false })
    setQuantity((current) => clampQuantity(current, maxQuantity(next)))
  }

  return (
    <>
      <Container className={pageClass}>
        <div className="flex items-center justify-between md:hidden">
          <BackButton />
          <FavoriteButton nft={nft} variant="icon" />
        </div>
        <nav aria-label="Trilha de navegação" className={breadcrumbClass}>
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-text-accent">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/" hash={CATALOG_HASH} className="hover:text-text-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>

        <div className={topGridClass}>
          <NftGallery name={nft.name} images={nft.gallery.length > 0 ? nft.gallery : [nft.image]} />
          <NftInfo
            nft={nft}
            edition={edition}
            quantity={quantity}
            max={max}
            limitReason={reason}
            shareUrl={shareUrl}
            cartAction={cartAction}
            onSelectEdition={selectEdition}
            onQuantityChange={changeQuantity}
          />
        </div>

        <NftDetailTabs nft={nft} />
        <CollectionCarousel collectionId={nft.collection.id} collectionName={nft.collection.name} nftId={nft.id} />
      </Container>

      <NftMobileBar
        edition={edition}
        quantity={quantity}
        max={max}
        limitReason={reason}
        cartAction={cartAction}
        onQuantityChange={changeQuantity}
      />
    </>
  )
}
