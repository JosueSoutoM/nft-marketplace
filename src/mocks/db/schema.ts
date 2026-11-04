import type { Network, NetworkId, Nft, Order, Quote, Wallet } from '@/api/contracts'
import type { CouponFixture } from '../fixtures/coupons'

export const DB_STORAGE_KEY = 'kurio.mocks.db.v3'
export const DB_SCHEMA_VERSION = 3

export interface UserRecord {
  id: string
  email: string
  passwordHash: string
  passwordSalt: string
  displayName: string
  username: string
  ensName: string | null
  walletNickname: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  tokenHash: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface FavoriteRecord {
  userId: string
  nftId: string
  createdAt: string
}

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedAt: string
}

export interface CartRecord {
  id: string
  ownerType: 'guest' | 'user'
  ownerId: string
  items: CartItemRecord[]
  couponCode: string | null
  quoteVersion: number
  lastQuoteFingerprint: string | null
  updatedAt: string
}

export type CouponRecord = CouponFixture

export interface QuoteRecord {
  quote: Quote
  fingerprint: string
}

export interface OrderRecord {
  userId: string
  idempotencyKey: string
  requestFingerprint: string
  plannedOutcome: 'confirmed' | 'declined'
  settleAt: string
  order: Order
}

export interface WalletRecord extends Omit<Wallet, 'connection'> {
  userId: string
}

export interface WalletConnectionRecord {
  userId: string
  walletId: string
  network: NetworkId
  status: 'connected' | 'disconnected'
  updatedAt: string
}

export interface MockDatabase {
  schemaVersion: typeof DB_SCHEMA_VERSION
  seededAt: string
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: Nft[]
  networks: Network[]
  favorites: FavoriteRecord[]
  carts: CartRecord[]
  coupons: CouponRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  wallets: WalletRecord[]
  walletConnections: WalletConnectionRecord[]
  sequences: Record<string, number>
}
