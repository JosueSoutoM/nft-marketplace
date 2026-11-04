import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { addCartItem, applyCoupon, getCart, removeCartItem, removeCoupon, updateCartItem } from '@/api/cart'
import type { AddCartItemRequest, Cart, NetworkId } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { createQuote } from '@/api/quotes'
import { getSessionSnapshot } from '@/api/session-token'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from './use-session'

export const CART_STALE_TIME_MS = 15_000
export const CART_QUOTE_NETWORK: NetworkId = 'ethereum'

function currentOwner(): string | null {
  return getSessionSnapshot().session?.userId ?? null
}

function isNewer(next: Cart, current: Cart | undefined): boolean {
  return !current || Date.parse(next.updatedAt) >= Date.parse(current.updatedAt)
}

function storeCart(queryClient: QueryClient, userId: string | null, cart: Cart): void {
  if (currentOwner() !== userId) {
    return
  }
  queryClient.setQueryData<Cart>(queryKeys.cart(userId), (current) => (isNewer(cart, current) ? cart : current))
  void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
}

function refreshAfterConflict(queryClient: QueryClient, userId: string | null, error: Error): void {
  if (currentOwner() !== userId || !isApiError(error) || error.status !== 409) {
    return
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
}

export function useCart() {
  const { userId } = useSession()
  return useQuery({
    queryKey: queryKeys.cart(userId),
    queryFn: ({ signal }) => getCart({ signal }),
    staleTime: CART_STALE_TIME_MS,
  })
}

export function useCartCount(): number {
  return useCart().data?.itemCount ?? 0
}

export function useCartQuote(cart: Cart | undefined) {
  const { userId } = useSession()
  return useQuery({
    queryKey: queryKeys.quotes.detail(userId, CART_QUOTE_NETWORK),
    queryFn: ({ signal }) => createQuote({ network: CART_QUOTE_NETWORK }, { signal }),
    enabled: !!cart && cart.items.length > 0,
    staleTime: CART_STALE_TIME_MS,
  })
}

type CartSuccessHandler<TVariables> = (cart: Cart, variables: TVariables) => void

function useCartMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Cart>,
  onSettledSuccess?: CartSuccessHandler<TVariables>,
) {
  const queryClient = useQueryClient()
  const { userId } = useSession()
  return useMutation<Cart, Error, TVariables>({
    mutationFn,
    onSuccess: (cart, variables) => {
      if (currentOwner() !== userId) {
        return
      }
      storeCart(queryClient, userId, cart)
      onSettledSuccess?.(cart, variables)
    },
    onError: (error) => refreshAfterConflict(queryClient, userId, error),
  })
}

export function useAddToCart() {
  return useCartMutation((body: AddCartItemRequest) => addCartItem(body))
}

export function useUpdateCartItem(itemId: string, onSuccess?: CartSuccessHandler<number>) {
  return useCartMutation((quantity: number) => updateCartItem(itemId, { quantity }), onSuccess)
}

export function useRemoveCartItem(itemId: string, onSuccess?: CartSuccessHandler<void>) {
  return useCartMutation(() => removeCartItem(itemId), onSuccess)
}

export function useApplyCoupon(onSuccess?: CartSuccessHandler<string>) {
  return useCartMutation((code: string) => applyCoupon({ code }), onSuccess)
}

export function useRemoveCoupon(onSuccess?: CartSuccessHandler<void>) {
  return useCartMutation(() => removeCoupon(), onSuccess)
}
