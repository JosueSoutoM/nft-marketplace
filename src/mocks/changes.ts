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

export function publishNftUpdated(nft: Nft): void {
  publish({
    userId: null,
    event: {
      id: crypto.randomUUID(),
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: nft.version,
      occurredAt: new Date().toISOString(),
      data: {
        editions: structuredClone(nft.editions),
        price: nft.price,
        compareAtPrice: nft.compareAtPrice,
      },
    },
  })
}

export function publishOrderUpdated(order: Order, userId: string): void {
  publish({
    userId,
    event: {
      id: crypto.randomUUID(),
      type: 'order.updated',
      resource: { type: 'order', id: order.id },
      version: order.version,
      occurredAt: order.updatedAt,
      data: structuredClone(order),
    },
  })
}
