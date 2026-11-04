import type { IsoDateTime, NetworkId, WalletType } from './common'

export const WALLET_SLOTS = ['primary', 'secondary'] as const
export type WalletSlot = (typeof WALLET_SLOTS)[number]

export const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/
export const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
export const ENS_NAME_PATTERN = /^[a-z0-9-]{3,63}\.eth$/
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4,12}$/

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
  connection: WalletConnection | null
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
