import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import type { NftEdition } from '@/api/contracts'
import { CartCountBadge } from '@/components/cart/cart-count'
import { useCartCount } from '@/hooks/use-cart'
import { cartLinkLabel } from '@/lib/cart-changes'
import { mobileBarClass, mobileBarRowClass, mobileBuyButtonClass, mobileCartLinkClass } from './layout'
import { NftPrice } from './nft-price'
import { QuantityStepper } from './quantity-stepper'
import type { AddToCartAction } from './use-add-to-cart-action'

type NftMobileBarProps = {
  edition: NftEdition
  quantity: number
  max: number
  limitReason: string
  cartAction: AddToCartAction
  onQuantityChange: (quantity: number) => void
}

export function NftMobileBar({ edition, quantity, max, limitReason, cartAction, onQuantityChange }: NftMobileBarProps) {
  const cartCount = useCartCount()

  return (
    <section aria-label="Quantidade, preço e compra" className={mobileBarClass}>
      <div className={mobileBarRowClass}>
        <QuantityStepper
          quantity={quantity}
          max={max}
          limitReason={limitReason}
          onChange={onQuantityChange}
          showLabel
          className="min-w-0"
        />
        <NftPrice edition={edition} className="shrink-0 text-[1.25rem] leading-10" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-disabled={cartAction.pending || cartAction.unavailable || undefined}
          aria-busy={cartAction.pending || undefined}
          onClick={cartAction.add}
          className={mobileBuyButtonClass}
        >
          Comprar NFT
        </button>
        <Link to="/cart" aria-label={cartLinkLabel(cartCount)} className={mobileCartLinkClass}>
          <ShoppingCart className="size-6" aria-hidden="true" />
          <CartCountBadge count={cartCount} className="top-1 right-1" />
        </Link>
      </div>
    </section>
  )
}
