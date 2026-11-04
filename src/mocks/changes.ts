import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/api/contracts'

export type MockChange =
  | { event: NftUpdatedEvent; userId: null }
  | { event: OrderUpdatedEvent; userId: string }

type ChangeListener = (change: MockChange) => void

const listeners = new Set<ChangeListener>()

function publish(change: MockChange): void {
  listeners.forEach((listener) => listener(change))
}

export function subscribeChanges(listener: ChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function buildNftUpdatedEvent(nft: Nft): NftUpdatedEvent {
  return {
    id: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    userId: null,
    occurredAt: new Date().toISOString(),
    data: {
      editions: structuredClone(nft.editions),
      price: nft.price,
      compareAtPrice: nft.compareAtPrice,
    },
  }
}

export function buildOrderUpdatedEvent(order: Order, userId: string): OrderUpdatedEvent {
  return {
    id: crypto.randomUUID(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    userId,
    occurredAt: order.updatedAt,
    data: structuredClone(order),
  }
}

export function publishNftUpdated(nft: Nft): void {
  publish({ event: buildNftUpdatedEvent(nft), userId: null })
}

export function publishOrderUpdated(order: Order, userId: string): void {
  publish({ event: buildOrderUpdatedEvent(order, userId), userId })
}
