import type { NftEdition } from '@/api/contracts'
import { mobileBarClass } from './layout'
import { NftPrice } from './nft-price'
import { QuantityStepper } from './quantity-stepper'

type NftMobileBarProps = {
  edition: NftEdition
  quantity: number
  max: number
  limitReason: string
  onQuantityChange: (quantity: number) => void
}

export function NftMobileBar({ edition, quantity, max, limitReason, onQuantityChange }: NftMobileBarProps) {
  return (
    <section aria-label="Quantidade e preço" className={mobileBarClass}>
      <QuantityStepper
        quantity={quantity}
        max={max}
        limitReason={limitReason}
        onChange={onQuantityChange}
        showLabel
        className="min-w-0"
      />
      <NftPrice edition={edition} className="shrink-0 text-[1.25rem] leading-10" />
    </section>
  )
}
