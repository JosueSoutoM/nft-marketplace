import type { EthAmount, IsoDateTime, NetworkId, Page } from './common'

export const NFT_CATEGORY_IDS = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
] as const
export type NftCategoryId = (typeof NFT_CATEGORY_IDS)[number]

export const NFT_SEGMENTS = ['all', 'new', 'trending'] as const
export type NftSegment = (typeof NFT_SEGMENTS)[number]

export const NFT_SORTS = ['recent', 'price-asc', 'price-desc', 'name-asc', 'rating-desc'] as const
export type NftSort = (typeof NFT_SORTS)[number]

export const NFT_DEFAULT_PAGE_SIZE = 9
export const NFT_MAX_PAGE_SIZE = 48
export const NFT_SEARCH_MAX_LENGTH = 100

export type NftRarity = 'common' | 'rare' | 'legendary'

export type NftEditionKind = 'unique' | 'limited' | 'open'

export interface NftImageSource {
  src: string
  width: number
}

export interface NftImage {
  alt: string
  src: string
  width: number
  height: number
  sources: NftImageSource[]
}

export interface NftEdition {
  id: string
  label: string
  kind: NftEditionKind
  supply: number
  available: number
  maxPerOrder: number
  price: EthAmount
  compareAtPrice: EthAmount | null
}

export interface NftRef {
  id: string
  name: string
}

export interface NftSummary {
  id: string
  name: string
  tokenId: string
  image: NftImage
  category: NftCategoryId
  network: NetworkId
  collection: NftRef
  creator: NftRef
  rarity: NftRarity
  editions: NftEdition[]
  defaultEditionId: string
  price: EthAmount
  compareAtPrice: EthAmount | null
  isNewRelease: boolean
  isTrending: boolean
  isFeatured: boolean
  listedAt: IsoDateTime
  version: number
}

export interface NftContract {
  address: string
  standard: 'ERC-721' | 'ERC-1155'
  royaltyPercent: string
}

export interface NftRating {
  average: number
  count: number
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: IsoDateTime
}

export interface Nft extends NftSummary {
  description: string
  story: string[]
  networkInfo: string
  contract: NftContract
  attributes: string[]
  gallery: NftImage[]
  rating: NftRating
  reviews: NftReview[]
}

export interface NftListQuery {
  q?: string
  category?: NftCategoryId[]
  network?: NetworkId[]
  collection?: string
  minPrice?: EthAmount
  maxPrice?: EthAmount
  segment?: NftSegment
  featured?: boolean
  sort?: NftSort
  page?: number
  pageSize?: number
}

export interface NftFacetOption<T extends string> {
  id: T
  label: string
  count: number
}

export interface NftFacets {
  categories: NftFacetOption<NftCategoryId>[]
  networks: NftFacetOption<NetworkId>[]
  priceRange: {
    min: EthAmount
    max: EthAmount
  }
}

export interface NftListResponse extends Page<NftSummary> {
  facets: NftFacets
}
