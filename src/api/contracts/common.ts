import type { EthAmount } from '@/lib/eth'

export type { EthAmount }

export type IsoDateTime = string

export const API_BASE_PATH = '/api'

export const NETWORK_IDS = ['ethereum', 'polygon', 'solana'] as const
export type NetworkId = (typeof NETWORK_IDS)[number]

export const WALLET_TYPES = ['metamask', 'walletconnect', 'coinbase'] as const
export type WalletType = (typeof WALLET_TYPES)[number]

export interface Network {
  id: NetworkId
  label: string
  fee: EthAmount
  feeEstimated: boolean
  explorerBaseUrl: string
}

export interface NetworkListResponse {
  items: Network[]
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
