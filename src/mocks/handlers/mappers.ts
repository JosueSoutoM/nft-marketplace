import type { Nft, NftSummary } from '@/api/contracts'

export function toNftSummary(nft: Nft): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.image,
    category: nft.category,
    network: nft.network,
    collection: nft.collection,
    creator: nft.creator,
    rarity: nft.rarity,
    editions: nft.editions,
    defaultEditionId: nft.defaultEditionId,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    isNewRelease: nft.isNewRelease,
    isTrending: nft.isTrending,
    isFeatured: nft.isFeatured,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}
