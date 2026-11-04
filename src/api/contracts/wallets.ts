import type { IsoDateTime, NetworkId, WalletType } from './common'

export const WALLET_SLOTS = ['primary', 'secondary'] as const
export type WalletSlot = (typeof WALLET_SLOTS)[number]

export interface WalletDetails {
  displayName: string
  nickname: string
  network: NetworkId
  profileName: string
  address: string
  secondaryAddress: string | null
  walletType: WalletType
  referralCode: string
  email: string
  ensName: string
}

export interface Wallet extends WalletDetails {
  id: string
  slot: WalletSlot
  sameAsPrimary: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface WalletListResponse {
  items: Wallet[]
}

export type UpsertWalletRequest = ({ sameAsPrimary?: false } & WalletDetails) | { sameAsPrimary: true }

export interface WalletConnection {
  walletId: string
  status: 'connected' | 'disconnected'
  network: NetworkId
  updatedAt: IsoDateTime
}

export interface ConnectWalletRequest {
  network: NetworkId
}
