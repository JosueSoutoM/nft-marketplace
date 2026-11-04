import type { NetworkId, NftListQuery, OrderListQuery } from '@/api/contracts'

export type OwnerKey = readonly ['user', string] | readonly ['guest']

export function ownerKey(userId: string | null): OwnerKey {
  return userId ? (['user', userId] as const) : (['guest'] as const)
}

export const queryKeys = {
  session: (userId: string) => ['user', userId, 'session'] as const,
  networks: () => ['networks'] as const,
  nfts: {
    all: () => ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (params: NftListQuery) => ['nfts', 'list', params] as const,
    details: () => ['nfts', 'detail'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
  },
  user: (userId: string) => ['user', userId] as const,
  guest: () => ['guest'] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  orders: {
    all: (userId: string) => ['user', userId, 'orders'] as const,
    list: (userId: string, query: OrderListQuery = {}) => ['user', userId, 'orders', 'list', query] as const,
    detail: (userId: string, orderId: string) => ['user', userId, 'orders', 'detail', orderId] as const,
  },
  cart: (userId: string | null) => [...ownerKey(userId), 'cart'] as const,
  quotes: {
    all: (userId: string | null) => [...ownerKey(userId), 'quote'] as const,
    detail: (userId: string | null, network: NetworkId) => [...ownerKey(userId), 'quote', network] as const,
  },
}
