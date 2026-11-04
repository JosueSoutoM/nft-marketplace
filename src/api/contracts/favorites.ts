import type { IsoDateTime } from './common'
import type { NftSummary } from './nfts'

export interface Favorite {
  nftId: string
  createdAt: IsoDateTime
  nft: NftSummary
}

export interface FavoriteListResponse {
  items: Favorite[]
}
