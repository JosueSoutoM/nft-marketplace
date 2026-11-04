import { couponFixtures } from '../fixtures/coupons'
import { networkFixtures } from '../fixtures/networks'
import { buildNftFixtures } from '../fixtures/nfts'
import { userFixtures } from '../fixtures/users'
import { hashPassword } from './crypto'
import { DB_SCHEMA_VERSION, type FavoriteRecord, type MockDatabase, type UserRecord, type WalletRecord } from './schema'

export async function createSeed(): Promise<MockDatabase> {
  const users: UserRecord[] = await Promise.all(
    userFixtures.map(async (fixture) => ({
      id: fixture.id,
      email: fixture.email,
      passwordHash: await hashPassword(fixture.password, fixture.passwordSalt),
      passwordSalt: fixture.passwordSalt,
      displayName: fixture.displayName,
      username: fixture.username,
      ensName: fixture.ensName,
      walletNickname: fixture.walletNickname,
      avatarUrl: null,
      createdAt: fixture.createdAt,
      updatedAt: fixture.createdAt,
    })),
  )

  const wallets: WalletRecord[] = userFixtures.flatMap((fixture) =>
    fixture.wallets.map(({ slot, details }) => ({
      ...details,
      id: `wallet-${fixture.username}-${slot}`,
      userId: fixture.id,
      slot,
      sameAsPrimary: false,
      createdAt: fixture.createdAt,
      updatedAt: fixture.createdAt,
    })),
  )

  const favorites: FavoriteRecord[] = userFixtures.flatMap((fixture) =>
    fixture.favoriteNftIds.map((nftId) => ({ userId: fixture.id, nftId, createdAt: fixture.createdAt })),
  )

  return {
    schemaVersion: DB_SCHEMA_VERSION,
    seededAt: new Date().toISOString(),
    users,
    sessions: [],
    nfts: buildNftFixtures(),
    networks: networkFixtures.map((network) => ({ ...network })),
    favorites,
    carts: [],
    coupons: couponFixtures.map((coupon) => ({ ...coupon })),
    quotes: [],
    orders: [],
    wallets,
    walletConnections: [],
    sequences: {},
  }
}
