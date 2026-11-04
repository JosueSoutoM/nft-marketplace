import type { EthAmount, IsoDateTime, NetworkId, WalletType } from './common'
import type { NftImage } from './nfts'

export const IDEMPOTENCY_HEADER = 'Idempotency-Key'
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
export const ORDER_NOTE_MAX_LENGTH = 500

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface CollectorDetails {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
}

export type PaymentWallet =
  | {
      source: 'saved'
      walletId: string
    }
  | {
      source: 'other'
      walletType: WalletType
      address: string
      secondaryAddress: string | null
    }

export interface CreateOrderRequest {
  quoteId: string
  quoteVersion: number
  network: NetworkId
  collector: CollectorDetails
  payment: PaymentWallet
  note: string | null
}

export interface OrderLine {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  image: NftImage
  editionLabel: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

export interface OrderReceipt {
  quoteId: string
  quoteVersion: number
  lines: OrderLine[]
  couponCode: string | null
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  network: NetworkId
  wallet: {
    walletType: WalletType
    address: string
    label: string
  }
  collector: CollectorDetails
  note: string | null
}

export interface OrderTransaction {
  hash: string
  explorerUrl: string
  confirmedAt: IsoDateTime
}

export interface OrderDecline {
  code: 'PAYMENT_DECLINED' | 'AVAILABILITY_LOST'
  reason: string
}

export interface Order {
  id: string
  status: OrderStatus
  version: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  receipt: OrderReceipt
  transaction: OrderTransaction | null
  decline: OrderDecline | null
}

export interface OrderListQuery {
  status?: OrderStatus
}

export interface OrderListResponse {
  items: Order[]
}
