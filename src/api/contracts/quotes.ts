import type { EthAmount, IsoDateTime, NetworkId } from './common'
import type { NftImage } from './nfts'

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

export interface Quote {
  id: string
  version: number
  cartId: string
  network: NetworkId
  lines: QuoteLine[]
  coupon: QuoteCoupon | null
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
