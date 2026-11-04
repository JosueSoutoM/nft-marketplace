import { GUEST_CART_HEADER } from './contracts'
import { getSessionToken } from './session-token'

const GUEST_CART_ID_KEY = 'kurio.guest-cart-id'

export function peekGuestCartId(): string | null {
  try {
    return localStorage.getItem(GUEST_CART_ID_KEY)
  } catch {
    return null
  }
}

export function getGuestCartId(): string {
  const existing = peekGuestCartId()
  if (existing) {
    return existing
  }
  const created = crypto.randomUUID()
  localStorage.setItem(GUEST_CART_ID_KEY, created)
  return created
}

export function clearGuestCartId(): void {
  localStorage.removeItem(GUEST_CART_ID_KEY)
}

export function cartOwnerHeaders(): Record<string, string> {
  return getSessionToken() ? {} : { [GUEST_CART_HEADER]: getGuestCartId() }
}
