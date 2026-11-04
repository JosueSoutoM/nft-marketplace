import type { EthAmount, IsoDateTime, NetworkId } from './common'
import type { NftImage } from './nfts'

export const QUOTE_TTL_SECONDS = 600

export type QuoteLineIssue = 'PRICE_CHANGED' | 'INSUFFICIENT_AVAILABILITY' | 'SOLD_OUT' | 'NOT_FOUND'

export interface QuoteLine {
  cartItemId: string
  nftId: string
  editionId: string
  name: string
  tokenId: string
  image: NftImage
  editionLabel: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
  available: number
  nftVersion: number
  issue: QuoteLineIssue | null
  previousUnitPrice: EthAmount | null
}

export interface QuoteCoupon {
  code: string
  percent: string
  label: string
}

export interface QuoteCouponError {
  code: string
  reason: 'COUPON_INVALID' | 'COUPON_EXPIRED'
  message: string
}

export interface Quote {
  id: string
  version: number
  cartId: string
  network: NetworkId
  lines: QuoteLine[]
  coupon: QuoteCoupon | null
  couponError: QuoteCouponError | null
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  networkFeeEstimated: boolean
  total: EthAmount
  purchasable: boolean
  createdAt: IsoDateTime
  expiresAt: IsoDateTime
}

export interface CreateQuoteRequest {
  network: NetworkId
}

export type QuoteChange =
  | { type: 'QUOTE_EXPIRED' }
  | { type: 'QUOTE_VERSION_MISMATCH'; sent: number; current: number }
  | { type: 'ITEMS_CHANGED' }
  | { type: 'NETWORK_CHANGED'; previous: NetworkId; current: NetworkId }
  | { type: 'PRICE_CHANGED'; nftId: string; editionId: string; previous: EthAmount; current: EthAmount }
  | { type: 'AVAILABILITY_CHANGED'; nftId: string; editionId: string; requested: number; available: number }
  | { type: 'COUPON_CHANGED'; previous: string | null; current: string | null; reason: QuoteCouponError['reason'] | null }
  | { type: 'NETWORK_FEE_CHANGED'; previous: EthAmount; current: EthAmount }
