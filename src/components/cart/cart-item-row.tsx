import { AlertTriangle, Info, Trash2 } from 'lucide-react'
import type { CartItem } from '@/api/contracts'
import { NftImage } from '@/components/nft/nft-image'
import { useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart'
import { announce } from '@/lib/announcer'
import { cartItemBlockingIssue, describeUnits } from '@/lib/cart-changes'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { CartQuantity } from './cart-quantity'
import { cartColumnsClass, cartRowClass, cartRowImageClass } from './layout'

type CartItemRowProps = {
  item: CartItem
  notice: string | undefined
  onRemoved: () => void
}

export function CartItemRow({ item, notice, onRemoved }: CartItemRowProps) {
  const label = `${item.name}, edição ${item.editionLabel}`
  const update = useUpdateCartItem(item.id, (_cart, quantity) =>
    announce(`Quantidade de ${label} alterada para ${quantity}.`),
  )
  const remove = useRemoveCartItem(item.id, () => {
    announce(`${label} foi removido do carrinho.`)
    onRemoved()
  })
  const busy = update.isPending || remove.isPending
  const blocking = cartItemBlockingIssue(item)
  const failure = update.error ?? remove.error

  function changeQuantity(quantity: number) {
    remove.reset()
    update.mutate(quantity)
  }

  function removeItem() {
    if (busy) {
      return
    }
    update.reset()
    remove.mutate()
  }

  return (
    <li
      data-slot="cart-item"
      aria-label={label}
      aria-busy={busy || undefined}
      className={cn(cartRowClass, cartColumnsClass, 'relative')}
    >
      <NftImage image={item.image} alt="" sizes="94px" className={cartRowImageClass} />

      <div className="min-w-0 self-start pt-3 pl-4 max-md:col-span-2 max-md:col-start-2 max-md:row-start-1 max-md:pr-11 md:self-center md:px-[1.125rem] md:pt-0">
        <h3 className="truncate text-body font-bold text-foreground md:text-body-lg md:leading-6">{item.name}</h3>
        <p className="hidden text-body-sm text-text-secondary md:block md:leading-5">ID do token: #{item.tokenId}</p>
        <p className="text-body-sm text-text-secondary md:leading-5">Edição: {item.editionLabel}</p>
      </div>

      <p className="text-body font-medium text-text-secondary max-md:hidden">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPrice)}
      </p>

      <CartQuantity
        item={item}
        busy={busy}
        onChange={changeQuantity}
        className="self-end pr-3 pb-3 max-md:col-start-3 max-md:row-start-2 md:self-center md:p-0"
      />

      <p className="self-end px-4 pb-3 text-body-lg font-bold text-text-accent max-md:col-start-2 max-md:row-start-2 md:self-center md:p-0 md:text-body">
        <span className="sr-only">
          Total do item ({describeUnits(item.quantity)} × {formatEth(item.unitPrice)}):{' '}
        </span>
        {formatEth(item.lineTotal)}
      </p>

      <div className="flex justify-end max-md:absolute max-md:top-1 max-md:right-1 md:items-center md:self-center">
        <button
          type="button"
          aria-label={`Remover ${label} do carrinho`}
          aria-disabled={busy || undefined}
          onClick={removeItem}
          className="flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      {(notice || blocking || failure) && (
        <div className="col-span-full flex flex-col gap-1 px-4 pb-3 text-body-sm max-md:row-start-3 md:px-[1.125rem] md:pt-0 md:pb-3 md:pl-[5.5rem]">
          {notice && (
            <p data-slot="cart-item-notice" className="flex items-start gap-2 text-text-accent">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
          {blocking && (
            <p data-slot="cart-item-issue" className="flex items-start gap-2 text-text-coral">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {blocking}
            </p>
          )}
          {failure && (
            <p role="alert" className="flex items-start gap-2 text-text-coral">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {failure.message}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
