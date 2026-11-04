import type { EthAmount, IsoDateTime } from './common'
import type { NftEditionKind, NftImage } from './nfts'

export const GUEST_CART_HEADER = 'X-Guest-Cart-Id'

export interface CartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  name: string
  tokenId: string
  image: NftImage
  editionLabel: string
  editionKind: NftEditionKind
  unitPrice: EthAmount
  lineTotal: EthAmount
  available: number
  maxQuantity: number
  nftVersion: number
}

export interface Cart {
  id: string
  owner: 'guest' | 'user'
  items: CartItem[]
  itemCount: number
  couponCode: string | null
  subtotal: EthAmount
  updatedAt: IsoDateTime
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface ApplyCouponRequest {
  code: string
}

export interface MergeCartRequest {
  guestCartId: string
}
