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
import { describeCartItemChange } from '@/lib/cart-changes'
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

function isDetailObserved(queryClient: QueryClient, nftId: string): boolean {
  return (queryClient.getQueryCache().find({ queryKey: queryKeys.nfts.detail(nftId) })?.getObserversCount() ?? 0) > 0
}

function describeCartChanges(cart: Cart | undefined, event: NftUpdatedEvent): string | null {
  const messages = (cart?.items ?? []).flatMap((item) => {
    if (item.nftId !== event.resource.id) {
      return []
    }
    const edition = event.data.editions.find((entry) => entry.id === item.editionId)
    const change = edition && describeCartItemChange(item, { unitPrice: edition.price, available: edition.available })
    return change ? [`${item.name}, edição ${item.editionLabel}, no carrinho: ${change}`] : []
  })
  return messages.length > 0 ? messages.join(' ') : null
}

export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent, userId: string | null): void {
  const nftId = event.resource.id
  const cartMessage = isDetailObserved(queryClient, nftId)
    ? null
    : describeCartChanges(queryClient.getQueryData<Cart>(queryKeys.cart(userId)), event)

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

  if (cartMessage) {
    announce(cartMessage)
  }
}

function isOrderObserved(queryClient: QueryClient, userId: string, orderId: string): boolean {
  return (queryClient.getQueryCache().find({ queryKey: queryKeys.orders.detail(userId, orderId) })?.getObserversCount() ?? 0) > 0
}

export function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent, userId: string): void {
  const orderId = event.resource.id
  const observed = isOrderObserved(queryClient, userId, orderId)
  queryClient.setQueryData<Order>(queryKeys.orders.detail(userId, orderId), (order) =>
    !order || (!isTerminalOrder(order) && order.version < event.version) ? event.data : order,
  )
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.orders.all(userId), 'list'] })

  if (event.data.status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
  }
  if (observed) {
    return
  }
  if (event.data.status === 'confirmed') {
    announce(`Pagamento do pedido ${orderId} confirmado. Seus NFTs já estão na sua carteira.`)
  } else if (event.data.status === 'declined') {
    announce(`O pagamento do pedido ${orderId} foi recusado. Os itens continuam no seu carrinho.`)
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
