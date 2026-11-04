import { Star } from 'lucide-react'
import type { Nft, NftEdition } from '@/api/contracts'
import { EditionPicker } from './edition-picker'
import { infoClass, infoLineClass, titleClass } from './layout'
import { NftPrice } from './nft-price'
import { NftShareLinks } from './nft-share-links'
import { QuantityStepper } from './quantity-stepper'
import { formatRating } from '@/lib/nft-edition'
import { StarRating } from './star-rating'

type NftInfoProps = {
  nft: Nft
  edition: NftEdition
  quantity: number
  max: number
  limitReason: string
  shareUrl: string
  onSelectEdition: (editionId: string) => void
  onQuantityChange: (quantity: number) => void
}

export function NftInfo({
  nft,
  edition,
  quantity,
  max,
  limitReason,
  shareUrl,
  onSelectEdition,
  onQuantityChange,
}: NftInfoProps) {
  const reviewsLabel = `${nft.rating.count} ${nft.rating.count === 1 ? 'avaliação' : 'avaliações'} de colecionadores`

  return (
    <section aria-labelledby="nft-title" className={infoClass}>
      <div className="flex items-start justify-between gap-4">
        <h1 id="nft-title" className={titleClass}>
          {nft.name}
        </h1>
        <p className="flex h-[1.625rem] shrink-0 items-center gap-1 rounded-full border border-primary px-2.5 text-body-sm text-foreground md:hidden">
          <Star className="size-3.5 fill-current text-primary" aria-hidden="true" />
          <span aria-hidden="true">
            {formatRating(nft.rating.average)}({nft.rating.count})
          </span>
          <span className="sr-only">
            Nota {formatRating(nft.rating.average)} de 5, {reviewsLabel}
          </span>
        </p>
      </div>

      <div className="mt-1 hidden flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border-soft pb-2 md:flex">
        <NftPrice edition={edition} className="text-[1.375rem] leading-8" />
        <p className="flex items-center gap-1.5 text-body-sm text-foreground">
          <StarRating value={nft.rating.average} />
          <span>{reviewsLabel}</span>
        </p>
      </div>

      <h2 className="mt-4 text-[0.9375rem] leading-6 font-bold text-foreground max-md:sr-only">Sobre este NFT:</h2>
      <p className="mt-3 text-body-sm text-text-secondary md:mt-1.5">{nft.description}</p>

      <EditionPicker editions={nft.editions} selectedId={edition.id} onSelect={onSelectEdition} />

      <QuantityStepper
        quantity={quantity}
        max={max}
        limitReason={limitReason}
        onChange={onQuantityChange}
        className="mt-4 hidden md:flex"
      />

      <dl className="mt-3 md:mt-4">
        <InfoLine term="ID do token" value={`#${nft.tokenId}`} />
        <InfoLine term="Coleção" value={nft.collection.name} />
        <InfoLine term="Criador" value={nft.creator.name} />
        <InfoLine term="Atributos" value={nft.attributes.join(', ')} />
        <InfoLine term="Disponível" value={`${edition.available} de ${edition.supply} na edição ${edition.label}`} />
      </dl>

      <div className="mt-1 hidden md:block">
        <NftShareLinks name={nft.name} url={shareUrl} />
      </div>
    </section>
  )
}

function InfoLine({ term, value }: { term: string; value: string }) {
  return (
    <div className={infoLineClass}>
      <dt className="inline">{term}: </dt>
      <dd className="inline">{value}</dd>
    </div>
  )
}
