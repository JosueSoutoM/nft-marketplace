import type {
  AddCartItemRequest,
  ApplyCouponRequest,
  Cart,
  MergeCartResponse,
  UpdateCartItemRequest,
} from './contracts'
import { cartOwnerHeaders, clearGuestCartId, peekGuestCartId } from './guest-cart'
import { http, type RequestOptions } from './http'

export async function getCart({ signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.get<Cart>('/cart', { headers: cartOwnerHeaders(), signal })
  return data
}

export async function addCartItem(body: AddCartItemRequest, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.post<Cart>('/cart/items', body, { headers: cartOwnerHeaders(), signal })
  return data
}

export async function updateCartItem(
  itemId: string,
  body: UpdateCartItemRequest,
  { signal }: RequestOptions = {},
): Promise<Cart> {
  const { data } = await http.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, body, {
    headers: cartOwnerHeaders(),
    signal,
  })
  return data
}

export async function removeCartItem(itemId: string, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, {
    headers: cartOwnerHeaders(),
    signal,
  })
  return data
}

export async function applyCoupon(body: ApplyCouponRequest, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.put<Cart>('/cart/coupon', body, { headers: cartOwnerHeaders(), signal })
  return data
}

export async function removeCoupon({ signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.delete<Cart>('/cart/coupon', { headers: cartOwnerHeaders(), signal })
  return data
}

export async function mergeGuestCart({ signal }: RequestOptions = {}): Promise<MergeCartResponse | null> {
  const guestCartId = peekGuestCartId()
  if (!guestCartId) {
    return null
  }
  const { data } = await http.post<MergeCartResponse>('/cart/merge', { guestCartId }, { signal })
  clearGuestCartId()
  return data
}
