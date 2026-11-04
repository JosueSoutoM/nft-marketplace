import type { QueryClient } from '@tanstack/react-query'
import type {
  Cart,
  FavoriteListResponse,
  Nft,
  NftListResponse,
  NftSummary,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
} from '@/api/contracts'
import { announce } from '@/lib/announcer'
import { compareEth, formatEth } from '@/lib/eth'
import { queryKeys } from '@/lib/query-keys'

const TERMINAL_STATUSES: ReadonlyArray<Order['status']> = ['confirmed', 'declined']

function patchNft<T extends NftSummary>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.resource.id || nft.version >= event.version) {
    return nft
  }
  return {
    ...nft,
    editions: event.data.editions,
    price: event.data.price,
    compareAtPrice: event.data.compareAtPrice,
    version: event.version,
  }
}

function cachedNftSummaries(queryClient: QueryClient, nftId: string, userId: string | null): NftSummary[] {
  const detail = queryClient.getQueryData<Nft>(queryKeys.nfts.detail(nftId))
  const fromLists = queryClient
    .getQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() })
    .flatMap(([, data]) => data?.items.filter((item) => item.id === nftId) ?? [])
  const fromFavorites = userId
    ? (queryClient.getQueryData<FavoriteListResponse>(queryKeys.favorites.index(userId))?.items ?? [])
        .filter((favorite) => favorite.nftId === nftId)
        .map((favorite) => favorite.nft)
    : []
  const fromFavoriteLists = userId
    ? queryClient
        .getQueriesData<NftListResponse>({ queryKey: queryKeys.favorites.lists(userId) })
        .flatMap(([, data]) => data?.items.filter((item) => item.id === nftId) ?? [])
    : []
  return [...(detail ? [detail] : []), ...fromLists, ...fromFavorites, ...fromFavoriteLists]
}

export function cachedNftVersion(queryClient: QueryClient, nftId: string, userId: string | null): number {
  return Math.max(0, ...cachedNftSummaries(queryClient, nftId, userId).map((nft) => nft.version))
}

export function cachedOrder(queryClient: QueryClient, userId: string, orderId: string): Order | undefined {
  return queryClient.getQueryData<Order>(queryKeys.orders.detail(userId, orderId))
}

export function isTerminalOrder(order: Order | undefined): boolean {
  return !!order && TERMINAL_STATUSES.includes(order.status)
}

function shouldAnnounceNftChange(queryClient: QueryClient, nftId: string, userId: string | null): boolean {
  const inCart = queryClient.getQueryData<Cart>(queryKeys.cart(userId))?.items.some((item) => item.nftId === nftId) ?? false
  const detailObserved = (queryClient.getQueryCache().find({ queryKey: queryKeys.nfts.detail(nftId) })?.getObserversCount() ?? 0) > 0
  return inCart && !detailObserved
}

function announceNftChange(previous: NftSummary | undefined, event: NftUpdatedEvent): void {
  if (!previous) {
    return
  }
  if (compareEth(previous.price, event.data.price) !== 0) {
    announce(`O preço de ${previous.name} mudou para ${formatEth(event.data.price)}.`)
    return
  }
  const before = previous.editions.find((edition) => edition.id === previous.defaultEditionId)
  const after = event.data.editions.find((edition) => edition.id === previous.defaultEditionId)
  if (before && after && before.available > 0 && after.available === 0) {
    announce(`${previous.name} esgotou na edição ${after.label}.`)
  } else if (before && after && before.available !== after.available) {
    announce(`A disponibilidade de ${previous.name} foi atualizada: ${after.available} na edição ${after.label}.`)
  }
}

export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent, userId: string | null): void {
  const nftId = event.resource.id
  const previous = cachedNftSummaries(queryClient, nftId, userId)[0]
  const relevant = shouldAnnounceNftChange(queryClient, nftId, userId)

  queryClient.setQueryData<Nft>(queryKeys.nfts.detail(nftId), (nft) => nft && patchNft(nft, event))
  const patchList = (data: NftListResponse | undefined) =>
    data && { ...data, items: data.items.map((item) => patchNft(item, event)) }
  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, patchList)
  if (userId) {
    queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.favorites.lists(userId) }, patchList)
    queryClient.setQueryData<FavoriteListResponse>(queryKeys.favorites.index(userId), (data) =>
      data && { items: data.items.map((favorite) => ({ ...favorite, nft: patchNft(favorite.nft, event) })) },
    )
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })

  if (relevant) {
    announceNftChange(previous, event)
  }
}

export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, userId: string): void {
  const orderId = event.resource.id
  queryClient.setQueryData<Order>(queryKeys.orders.detail(userId, orderId), (order) =>
    !order || (!isTerminalOrder(order) && order.version < event.version) ? event.data : order,
  )
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.orders.all(userId), 'list'] })

  if (event.data.status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
    announce('Pagamento confirmado. Seus NFTs já estão na sua carteira.')
  } else if (event.data.status === 'declined') {
    announce('O pagamento foi recusado. Os itens continuam no seu carrinho.')
  }
}

export function reconcileActiveQueries(queryClient: QueryClient, userId: string | null): void {
  const keys = [
    queryKeys.nfts.all(),
    queryKeys.cart(userId),
    queryKeys.quotes.all(userId),
    ...(userId ? [queryKeys.orders.all(userId), queryKeys.favorites.all(userId)] : []),
  ]
  keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey, refetchType: 'active' }))
}
