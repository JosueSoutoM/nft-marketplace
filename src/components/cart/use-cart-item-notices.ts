import { useState } from 'react'
import type { Cart } from '@/api/contracts'
import { describeCartItemChange, type CartItemSnapshot } from '@/lib/cart-changes'

interface TrackedCart {
  cart: Cart | undefined
  snapshots: ReadonlyMap<string, CartItemSnapshot>
  notices: ReadonlyMap<string, string>
}

function snapshotsOf(cart: Cart | undefined): ReadonlyMap<string, CartItemSnapshot> {
  return new Map((cart?.items ?? []).map((item) => [item.id, { unitPrice: item.unitPrice, available: item.available }]))
}

export function useCartItemNotices(cart: Cart | undefined): ReadonlyMap<string, string> {
  const [tracked, setTracked] = useState<TrackedCart>(() => ({ cart, snapshots: snapshotsOf(cart), notices: new Map() }))

  if (tracked.cart !== cart) {
    const notices = new Map<string, string>()
    for (const item of cart?.items ?? []) {
      const before = tracked.snapshots.get(item.id)
      const change = before && describeCartItemChange(before, item)
      const previous = tracked.notices.get(item.id)
      if (change) {
        notices.set(item.id, change)
      } else if (previous) {
        notices.set(item.id, previous)
      }
    }
    const next = { cart, snapshots: cart ? snapshotsOf(cart) : tracked.snapshots, notices }
    setTracked(next)
    return next.notices
  }
  return tracked.notices
}
