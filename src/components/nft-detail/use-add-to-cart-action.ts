import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { Cart, NftEdition, NftSummary } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { useAddToCart, useCart } from '@/hooks/use-cart'
import { announce } from '@/lib/announcer'
import { describeItems, describeUnits } from '@/lib/cart-changes'
import { maxQuantity } from '@/lib/nft-edition'

function quantityInCart(cart: Cart | undefined, nftId: string, editionId: string): number {
  return cart?.items.find((item) => item.nftId === nftId && item.editionId === editionId)?.quantity ?? 0
}

export function useAddToCartAction(nft: NftSummary, edition: NftEdition, quantity: number, limitReason: string) {
  const navigate = useNavigate()
  const cart = useCart()
  const mutation = useAddToCart()
  const unavailable = maxQuantity(edition) === 0

  function add() {
    if (mutation.isPending) {
      return
    }
    if (unavailable) {
      announce(limitReason)
      return
    }
    const alreadyInCart = quantityInCart(cart.data, nft.id, edition.id)
    mutation.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: (updated) => {
          toast.success(`${nft.name} foi adicionado ao carrinho.`, {
            id: 'cart-add',
            description: `${describeUnits(quantity)} da edição ${edition.label}. O carrinho tem ${describeItems(updated.itemCount)}.`,
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
          })
        },
        onError: (error) => {
          const issue = isApiError(error) ? error.details.availability?.[0] : undefined
          if (issue) {
            const limit =
              issue.maxQuantity === 0
                ? 'Esta edição está esgotada.'
                : issue.reason === 'STOCK'
                  ? `Disponível nesta edição: ${describeUnits(issue.maxQuantity)}.`
                  : `Limite por pedido nesta edição: ${describeUnits(issue.maxQuantity)}.`
            toast.error(error.message, {
              id: 'cart-add',
              description: alreadyInCart > 0 ? `Você já tem ${describeUnits(alreadyInCart)} no carrinho. ${limit}` : limit,
            })
            return
          }
          toast.error(`Não foi possível adicionar ${nft.name} ao carrinho.`, { id: 'cart-add', description: error.message })
        },
      },
    )
  }

  return { add, pending: mutation.isPending, unavailable }
}

export type AddToCartAction = ReturnType<typeof useAddToCartAction>
